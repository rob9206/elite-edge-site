import type { Assignee, TaskStatus } from '@prisma/client';

/** A template step for a job type. Deterministic; not LLM-generated. */
export interface TaskSpec {
  key: string; // stable within a template
  title: string;
  detail: string;
  complexity: number; // 1-5
  estHours: number;
  dependsOnKeys: string[]; // references other specs' keys
}

/** A task after assignment + ordering, ready to persist. */
export interface PlannedTask {
  key: string;
  title: string;
  detail: string;
  complexity: number;
  estHours: number;
  assignedTo: Assignee;
  dependsOnKeys: string[];
  orderIndex: number;
  status: TaskStatus;
}

/** A rule violation found while validating a task graph. */
export interface PlanViolation {
  code:
    | 'assignment_mismatch'
    | 'foti_depends_on_steve'
    | 'missing_dependency'
    | 'cycle'
    | 'order_before_dependency';
  taskKey: string;
  message: string;
}
