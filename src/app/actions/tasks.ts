'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { assertAdmin, getCurrentUser } from '@/lib/auth/session';
import { appendLedger } from '@/lib/ledger';
import { reassignSchema, taskStatusSchema } from '@/lib/validation';
import { validatePlan } from '@/lib/plan/engine';
import type { PlannedTask } from '@/lib/plan/types';

/** Foti reassigns a task in one click; re-validates the hard dependency rule. */
export async function reassignTaskAction(formData: FormData) {
  const user = await assertAdmin();
  const parsed = reassignSchema.safeParse({
    taskId: formData.get('taskId'),
    assignedTo: formData.get('assignedTo'),
  });
  if (!parsed.success) return { error: 'Invalid reassignment.' };

  const task = await prisma.task.findUnique({ where: { id: parsed.data.taskId } });
  if (!task) return { error: 'Task not found.' };

  const siblings = await prisma.task.findMany({ where: { planId: task.planId } });
  // Model tasks as PlannedTask keyed by id, with the proposed change applied.
  const planned: PlannedTask[] = siblings.map((t) => ({
    key: t.id,
    title: t.title,
    detail: t.detail,
    complexity: t.complexity,
    estHours: t.estHours,
    assignedTo: t.id === task.id ? parsed.data.assignedTo : t.assignedTo,
    dependsOnKeys: t.dependsOn,
    orderIndex: t.orderIndex,
    status: t.status,
  }));

  const violations = validatePlan(planned).filter((v) => v.code === 'foti_depends_on_steve');
  if (violations.length) {
    return { error: violations[0]!.message };
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id: task.id }, data: { assignedTo: parsed.data.assignedTo } });
    await appendLedger(tx, {
      jobId: task.jobId,
      event: 'change_order',
      actor: user.username,
      payload: { task: task.title, from: task.assignedTo, to: parsed.data.assignedTo },
    });
  });

  revalidatePath(`/jobs/${task.jobId}`);
  return { ok: true };
}

/** Update a task's status. Steve may only touch tasks assigned to him. */
export async function setTaskStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated.' };
  const parsed = taskStatusSchema.safeParse({
    taskId: formData.get('taskId'),
    status: formData.get('status'),
  });
  if (!parsed.success) return { error: 'Invalid status.' };

  const task = await prisma.task.findUnique({ where: { id: parsed.data.taskId } });
  if (!task) return { error: 'Task not found.' };

  if (user.role !== 'admin' && task.assignedTo !== 'steve') {
    return { error: 'You can only update your own tasks.' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id: task.id }, data: { status: parsed.data.status } });
    await appendLedger(tx, {
      jobId: task.jobId,
      event: 'note',
      actor: user.username,
      payload: { task: task.title, status: parsed.data.status },
    });
    // When the first task goes active, move an approved/scheduled job to active.
    if (parsed.data.status === 'active') {
      const job = await tx.job.findUnique({ where: { id: task.jobId }, select: { status: true } });
      if (job?.status === 'scheduled') {
        await tx.job.update({ where: { id: task.jobId }, data: { status: 'active' } });
      }
    }
  });

  revalidatePath(`/jobs/${task.jobId}`);
  return { ok: true };
}
