import type { JobStatus, LedgerEvent, PaymentStatus } from '@prisma/client';
import { mapInvoiceStatus, statusRank } from '../uniwire/status';
import type { UniwireWebhookEvent } from '../uniwire/types';

/** Minimal persistence surface the webhook processor needs. */
export interface PaymentRepo {
  getPaymentByInvoiceId(invoiceId: string): Promise<{
    id: string;
    jobId: string;
    status: PaymentStatus;
  } | null>;
  recordCallback(input: {
    invoiceId: string;
    paymentId: string | null;
    status: string;
    signatureValid: boolean;
    rawBody: string;
  }): Promise<void>;
  updatePaymentStatus(paymentId: string, status: PaymentStatus): Promise<void>;
  appendLedger(input: {
    jobId: string;
    event: LedgerEvent;
    actor: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
  getJobStatus(jobId: string): Promise<JobStatus | null>;
  setJobStatus(jobId: string, status: JobStatus): Promise<void>;
}

export interface ProcessResult {
  changed: boolean;
  released: boolean;
  reason:
    | 'applied'
    | 'duplicate'
    | 'unknown_invoice'
    | 'unknown_status'
    | 'flagged_incomplete';
}

/**
 * Process a verified webhook event idempotently.
 *
 * - The raw body is always recorded (for replay/audit), even on no-op.
 * - A status only moves forward (statusRank). Replaying the same confirmation
 *   N times changes state exactly once (acceptance #6).
 * - invoice_incomplete flags the payment for review and never releases the job
 *   (acceptance #7); applied once, repeats are no-ops.
 * - confirmed/complete release an `approved` job to `scheduled` (once).
 */
export async function processWebhookEvent(
  event: UniwireWebhookEvent,
  repo: PaymentRepo,
  opts: { signatureValid: boolean; rawBody: string },
): Promise<ProcessResult> {
  const payment = await repo.getPaymentByInvoiceId(event.invoiceId);

  // Always record the raw callback, even for unknown invoices.
  await repo.recordCallback({
    invoiceId: event.invoiceId,
    paymentId: payment?.id ?? null,
    status: event.status,
    signatureValid: opts.signatureValid,
    rawBody: opts.rawBody,
  });

  if (!payment) {
    return { changed: false, released: false, reason: 'unknown_invoice' };
  }

  const mapping = mapInvoiceStatus(event.status);
  if (!mapping) {
    return { changed: false, released: false, reason: 'unknown_status' };
  }

  const current = payment.status;
  const next = mapping.paymentStatus;

  // Decide whether this event advances state.
  let shouldApply: boolean;
  if (mapping.flagForReview) {
    // incomplete: apply once (first time we see it).
    shouldApply = current !== 'incomplete';
  } else {
    // Forward-only: strictly higher rank. Never downgrade out of incomplete.
    shouldApply = current !== 'incomplete' && statusRank(next) > statusRank(current);
  }

  if (!shouldApply) {
    return {
      changed: false,
      released: false,
      reason: mapping.flagForReview ? 'flagged_incomplete' : 'duplicate',
    };
  }

  await repo.updatePaymentStatus(payment.id, next);
  await repo.appendLedger({
    jobId: payment.jobId,
    event: mapping.ledgerEvent,
    actor: 'uniwire',
    payload: { invoiceId: event.invoiceId, status: event.status },
  });

  // Release to scheduled only on confirmed+ and only from `approved`.
  let released = false;
  if (mapping.releasesJob) {
    const jobStatus = await repo.getJobStatus(payment.jobId);
    if (jobStatus === 'approved') {
      await repo.setJobStatus(payment.jobId, 'scheduled');
      released = true;
    }
  }

  return {
    changed: true,
    released,
    reason: mapping.flagForReview ? 'flagged_incomplete' : 'applied',
  };
}
