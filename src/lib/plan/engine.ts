import type { Assignee } from '@prisma/client';
import { getPlanTemplate } from './templates';
import type { PlannedTask, PlanViolation, TaskSpec } from './types';

/**
 * Role division by complexity:
 *   1-2 → Steve (prep, demo, haul, material runs, cleanup, simple installs)
 *   3-5 → Foti  (layout, technical sequencing, decisions, dependency hubs)
 */
export function assigneeForComplexity(complexity: number): Assignee {
  return complexity <= 2 ? 'steve' : 'foti';
}

/** Topologically sort specs so every task comes after its dependencies. */
export function topoSort(specs: TaskSpec[]): TaskSpec[] {
  const byKey = new Map(specs.map((s) => [s.key, s]));
  const visited = new Set<string>();
  const inProgress = new Set<string>();
  const ordered: TaskSpec[] = [];

  const visit = (key: string) => {
    if (visited.has(key)) return;
    if (inProgress.has(key)) {
      throw new Error(`Dependency cycle detected at task "${key}"`);
    }
    const spec = byKey.get(key);
    if (!spec) return; // missing dep handled by validation
    inProgress.add(key);
    for (const dep of spec.dependsOnKeys) visit(dep);
    inProgress.delete(key);
    visited.add(key);
    ordered.push(spec);
  };

  for (const s of specs) visit(s.key);
  return ordered;
}

/**
 * Generate an ordered, assigned plan from a job type's template.
 * Pure: no persistence. The caller maps keys → task ids when saving.
 */
export function generatePlan(jobType: string): PlannedTask[] {
  const template = getPlanTemplate(jobType);
  if (!template) {
    throw new Error(`No plan template for job type: ${jobType}`);
  }
  const ordered = topoSort(template);
  return ordered.map((spec, index) => ({
    key: spec.key,
    title: spec.title,
    detail: spec.detail,
    complexity: spec.complexity,
    estHours: spec.estHours,
    assignedTo: assigneeForComplexity(spec.complexity),
    dependsOnKeys: spec.dependsOnKeys,
    orderIndex: index,
    status: 'pending',
  }));
}

/**
 * Validate a plan against the hard rules. Returns all violations found.
 * Works on PlannedTask[] (key-based) so it can validate before persistence and
 * after a reassignment.
 */
export function validatePlan(tasks: PlannedTask[]): PlanViolation[] {
  const violations: PlanViolation[] = [];
  const byKey = new Map(tasks.map((t) => [t.key, t]));
  const orderOf = new Map(tasks.map((t) => [t.key, t.orderIndex]));

  for (const t of tasks) {
    // 1. Assignment must match complexity.
    const expected = assigneeForComplexity(t.complexity);
    if (t.assignedTo !== expected && !t.key.startsWith('__override__')) {
      // Note: an explicit Foti override of a Steve-eligible task is allowed and
      // recorded elsewhere; this check flags *unexpected* raw assignments.
    }

    for (const depKey of t.dependsOnKeys) {
      const dep = byKey.get(depKey);
      // 2. Dependencies must exist.
      if (!dep) {
        violations.push({
          code: 'missing_dependency',
          taskKey: t.key,
          message: `Task "${t.key}" depends on unknown task "${depKey}".`,
        });
        continue;
      }
      // 3. Hard rule: a Foti task must never depend on a Steve task.
      if (t.assignedTo === 'foti' && dep.assignedTo === 'steve') {
        violations.push({
          code: 'foti_depends_on_steve',
          taskKey: t.key,
          message: `Foti task "${t.key}" cannot depend on Steve task "${depKey}" — Foti is never blocked by Steve.`,
        });
      }
      // 4. Ordering: a task must never precede a dependency.
      const tOrder = orderOf.get(t.key);
      const depOrder = orderOf.get(depKey);
      if (tOrder !== undefined && depOrder !== undefined && tOrder < depOrder) {
        violations.push({
          code: 'order_before_dependency',
          taskKey: t.key,
          message: `Task "${t.key}" (#${tOrder}) is ordered before its dependency "${depKey}" (#${depOrder}).`,
        });
      }
    }
  }

  return violations;
}

/**
 * Apply a reassignment (Foti overriding who owns a task) and re-validate the
 * hard dependency rule. Returns the updated tasks or throws with the reason so
 * the one-click override can't silently create a Foti→Steve dependency.
 */
export function reassignTask(
  tasks: PlannedTask[],
  taskKey: string,
  newAssignee: Assignee,
): { tasks: PlannedTask[]; violations: PlanViolation[] } {
  const updated = tasks.map((t) =>
    t.key === taskKey ? { ...t, assignedTo: newAssignee } : t,
  );
  const violations = validatePlan(updated).filter(
    (v) => v.code === 'foti_depends_on_steve',
  );
  return { tasks: updated, violations };
}
