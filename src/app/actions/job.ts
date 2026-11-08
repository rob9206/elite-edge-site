'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { assertAdmin, getCurrentUser } from '@/lib/auth/session';
import { appendLedger } from '@/lib/ledger';

const noteSchema = z.object({ jobId: z.string().min(1), text: z.string().min(1).max(2000) });

/** Any staff user can add a note to the ledger. */
export async function addNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated.' };
  const parsed = noteSchema.safeParse({ jobId: formData.get('jobId'), text: formData.get('text') });
  if (!parsed.success) return { error: 'Enter a note.' };

  await appendLedger(prisma, {
    jobId: parsed.data.jobId,
    event: 'note',
    actor: user.username,
    payload: { text: parsed.data.text },
  });
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { ok: true };
}

/** Foti closes a job. */
export async function closeJobAction(formData: FormData) {
  const user = await assertAdmin();
  const jobId = String(formData.get('jobId') ?? '');
  if (!jobId) return { error: 'Missing job.' };
  await prisma.$transaction(async (tx) => {
    await tx.job.update({ where: { id: jobId }, data: { status: 'closed' } });
    await appendLedger(tx, { jobId, event: 'closed', actor: user.username, payload: {} });
  });
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}
