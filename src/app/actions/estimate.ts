'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { assertAdmin } from '@/lib/auth/session';
import { appendLedger } from '@/lib/ledger';
import { estimateSchema } from '@/lib/validation';
import { buildDraftEstimate, computeEstimate } from '@/lib/estimate/engine';
import { getJobTypeConfig } from '@/lib/estimate/catalog';
import { generatePlan } from '@/lib/plan/engine';
import type { LineItem } from '@/lib/estimate/types';

/** Build a draft estimate from the catalog × the job's measurements (admin). */
export async function buildEstimateAction(jobId: string) {
  const user = await assertAdmin();
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { error: 'Job not found.' };

  const draft = buildDraftEstimate(job.jobType, job.measurements as Record<string, unknown>);
  const last = await prisma.estimate.findFirst({
    where: { jobId },
    orderBy: { revision: 'desc' },
  });

  await prisma.$transaction(async (tx) => {
    await tx.estimate.create({
      data: {
        jobId,
        lineItems: draft.lines.map(stripComputed) as object,
        subtotalCents: draft.subtotalCents,
        contingencyBps: draft.contingencyBps,
        contingencyCents: draft.contingencyCents,
        taxBps: draft.taxBps,
        taxCents: draft.taxCents,
        totalCents: draft.totalCents,
        revision: (last?.revision ?? 0) + 1,
      },
    });
    if (job.status === 'draft') {
      await tx.job.update({ where: { id: jobId }, data: { status: 'estimated' } });
    }
    await appendLedger(tx, {
      jobId,
      event: 'estimated',
      actor: user.username,
      payload: { totalCents: draft.totalCents, revision: (last?.revision ?? 0) + 1 },
    });
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

/** Save an edited/overridden estimate as a new revision (admin). */
export async function saveEstimateAction(_prev: unknown, formData: FormData) {
  const user = await assertAdmin();
  const payload = {
    jobId: String(formData.get('jobId') ?? ''),
    lineItems: JSON.parse(String(formData.get('lineItems') ?? '[]')),
    contingencyBps: formData.get('contingencyBps'),
    taxBps: formData.get('taxBps'),
  };
  const parsed = estimateSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid estimate.' };
  }
  const { jobId, lineItems, contingencyBps, taxBps } = parsed.data;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { error: 'Job not found.' };

  const computed = computeEstimate(lineItems as LineItem[], contingencyBps, taxBps);
  const last = await prisma.estimate.findFirst({ where: { jobId }, orderBy: { revision: 'desc' } });
  if (last?.approvedAt) return { error: 'Estimate already approved; create a change order instead.' };

  await prisma.$transaction(async (tx) => {
    await tx.estimate.create({
      data: {
        jobId,
        lineItems: computed.lines.map(stripComputed) as object,
        subtotalCents: computed.subtotalCents,
        contingencyBps: computed.contingencyBps,
        contingencyCents: computed.contingencyCents,
        taxBps: computed.taxBps,
        taxCents: computed.taxCents,
        totalCents: computed.totalCents,
        revision: (last?.revision ?? 0) + 1,
      },
    });
    if (job.status === 'draft') {
      await tx.job.update({ where: { id: jobId }, data: { status: 'estimated' } });
    }
    await appendLedger(tx, {
      jobId,
      event: 'estimated',
      actor: user.username,
      payload: { totalCents: computed.totalCents, revision: (last?.revision ?? 0) + 1, edited: true },
    });
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

/**
 * Approve the latest estimate and generate the plan (admin only, acceptance #2).
 * Creates the plan + tasks with complexity-based assignment and dependency
 * order, mapping template keys → task ids for depends_on. (acceptance #3, #4)
 */
export async function approveEstimateAction(estimateId: string) {
  const user = await assertAdmin();
  const estimate = await prisma.estimate.findUnique({ where: { id: estimateId }, include: { job: true } });
  if (!estimate) return { error: 'Estimate not found.' };
  if (estimate.approvedAt) return { error: 'Already approved.' };

  const planned = generatePlan(estimate.job.jobType);

  await prisma.$transaction(async (tx) => {
    await tx.estimate.update({
      where: { id: estimateId },
      data: { approvedBy: user.username, approvedAt: new Date() },
    });

    const plan = await tx.plan.create({
      data: { jobId: estimate.jobId, estimateId, sequence: 1 },
    });

    // First pass: create tasks, remember key → id.
    const keyToId = new Map<string, string>();
    for (const t of planned) {
      const created = await tx.task.create({
        data: {
          planId: plan.id,
          jobId: estimate.jobId,
          title: t.title,
          detail: t.detail,
          complexity: t.complexity,
          assignedTo: t.assignedTo,
          estHours: t.estHours,
          orderIndex: t.orderIndex,
          status: 'pending',
          dependsOn: [],
        },
      });
      keyToId.set(t.key, created.id);
    }
    // Second pass: wire depends_on using real ids.
    for (const t of planned) {
      const id = keyToId.get(t.key)!;
      const deps = t.dependsOnKeys.map((k) => keyToId.get(k)!).filter(Boolean);
      if (deps.length) await tx.task.update({ where: { id }, data: { dependsOn: deps } });
    }

    await tx.job.update({ where: { id: estimate.jobId }, data: { status: 'approved' } });

    await appendLedger(tx, {
      jobId: estimate.jobId,
      event: 'approved',
      actor: user.username,
      payload: { estimateId, totalCents: estimate.totalCents },
    });
    for (const t of planned) {
      await appendLedger(tx, {
        jobId: estimate.jobId,
        event: 'assigned',
        actor: user.username,
        payload: { task: t.title, assignedTo: t.assignedTo, complexity: t.complexity },
      });
    }
  });

  revalidatePath(`/jobs/${estimate.jobId}`);
  return { ok: true };
}

/** Drop the computed field before persisting a line item array. */
function stripComputed(l: { lineTotalCents?: number } & LineItem): LineItem {
  const { lineTotalCents: _omit, ...rest } = l;
  return rest;
}
