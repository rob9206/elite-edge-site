import { describe, it, expect } from 'vitest';
import {
  assigneeForComplexity,
  generatePlan,
  validatePlan,
  reassignTask,
  topoSort,
} from './plan/engine';
import { PLAN_TEMPLATES } from './plan/templates';
import type { PlannedTask } from './plan/types';

describe('plan engine', () => {
  it('assigns complexity 1-2 to Steve and 3-5 to Foti', () => {
    expect(assigneeForComplexity(1)).toBe('steve');
    expect(assigneeForComplexity(2)).toBe('steve');
    expect(assigneeForComplexity(3)).toBe('foti');
    expect(assigneeForComplexity(5)).toBe('foti');
  });

  it('generates every template in dependency order with correct assignment', () => {
    for (const jobType of Object.keys(PLAN_TEMPLATES)) {
      const plan = generatePlan(jobType);
      // Assignment matches complexity (acceptance #3a).
      for (const t of plan) {
        expect(t.assignedTo).toBe(t.complexity <= 2 ? 'steve' : 'foti');
      }
      // Dependency ordering: a task never precedes its dependency (acceptance #3b).
      const order = new Map(plan.map((t) => [t.key, t.orderIndex]));
      for (const t of plan) {
        for (const dep of t.dependsOnKeys) {
          expect(order.get(t.key)!).toBeGreaterThan(order.get(dep)!);
        }
      }
      // Hard rule: no Foti task depends on a Steve task.
      expect(validatePlan(plan)).toHaveLength(0);
    }
  });

  it('detects a Foti task depending on a Steve task', () => {
    const tasks: PlannedTask[] = [
      { key: 'a', title: 'prep', detail: '', complexity: 1, estHours: 1, assignedTo: 'steve', dependsOnKeys: [], orderIndex: 0, status: 'pending' },
      { key: 'b', title: 'tech', detail: '', complexity: 4, estHours: 1, assignedTo: 'foti', dependsOnKeys: ['a'], orderIndex: 1, status: 'pending' },
    ];
    const violations = validatePlan(tasks);
    expect(violations.some((v) => v.code === 'foti_depends_on_steve')).toBe(true);
  });

  it('flags a reassignment that would block Foti on Steve', () => {
    // panel_upgrade: 'label' (Steve, c2) depends on 'energize' (Foti). Reassigning
    // 'energize' to Steve would leave Foti's 'inspect' depending on a Steve task.
    const plan = generatePlan('panel_upgrade');
    const { violations } = reassignTask(plan, 'energize', 'steve');
    expect(violations.some((v) => v.code === 'foti_depends_on_steve')).toBe(true);
  });

  it('allows a valid reassignment', () => {
    const plan = generatePlan('panel_upgrade');
    // 'label' is terminal (nothing depends on it); reassigning it to Foti is fine.
    const { violations } = reassignTask(plan, 'label', 'foti');
    expect(violations).toHaveLength(0);
  });

  it('throws on a dependency cycle', () => {
    expect(() =>
      topoSort([
        { key: 'a', title: '', detail: '', complexity: 1, estHours: 0, dependsOnKeys: ['b'] },
        { key: 'b', title: '', detail: '', complexity: 1, estHours: 0, dependsOnKeys: ['a'] },
      ]),
    ).toThrow(/cycle/i);
  });
});
