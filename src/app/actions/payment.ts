'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { assertAdmin } from '@/lib/auth/session';
import { appendLedger } from '@/lib/ledger';
import { invoiceSchema } from '@/lib/validation';
import { getGateway } from '@/lib/uniwire';
import { dollarsToCents } from '@/lib/money';

/**
 * Issue a Uniwire invoice for a manual amount (admin). The amount is operator-
 * entered and validated > 0. Writes a payment row and a ledger entry.
 * (acceptance #5)
 */
export async function issueInvoiceAction(_prev: unknown, formData: FormData) {
  const user = await assertAdmin();
  const parsed = invoiceSchema.safeParse({
    jobId: formData.get('jobId'),
    estimateId: formData.get('estimateId'),
    amountUsd: formData.get('amountUsd'),
    kind: formData.get('kind'),
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid invoice request.' };
  }
  const { jobId, estimateId, amountUsd, kind, notes } = parsed.data;

  const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
  if (!estimate || estimate.jobId !== jobId) return { error: 'Estimate not found for this job.' };
  if (!estimate.approvedAt) return { error: 'Approve the estimate before issuing an invoice.' };

  const gateway = getGateway();
  let invoice;
  try {
    invoice = await gateway.createInvoice({ amountUsd, kind, jobId, estimateId, notes });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Payment gateway error.' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        jobId,
        estimateId,
        uniwireInvoiceId: invoice.invoiceId,
        kind,
        amountCents: dollarsToCents(amountUsd),
        currency: 'USD',
        status: 'pending',
        address: invoice.address ?? null,
        lightningPaymentRequest: invoice.lightning?.payment_request ?? null,
      },
    });
    await appendLedger(tx, {
      jobId,
      event: 'payment_pending',
      actor: user.username,
      payload: { invoiceId: invoice.invoiceId, amountUsd, kind },
    });
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true, invoiceId: invoice.invoiceId };
}
