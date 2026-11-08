import type { LedgerEvent, PaymentStatus } from '@prisma/client';

/** What a given raw Uniwire invoice status means for our ledger + job state. */
export interface StatusMapping {
  paymentStatus: PaymentStatus;
  ledgerEvent: LedgerEvent;
  /** confirmed+ releases the job to `scheduled`. */
  releasesJob: boolean;
  /** invoice_incomplete flags for manual review and never releases work. */
  flagForReview: boolean;
}

/**
 * Map a raw Uniwire invoice status to our internal effects.
 *
 *   invoice_pending   → payment_pending   (no release)
 *   invoice_confirmed → payment_confirmed (release to scheduled)
 *   invoice_complete  → paid              (release to scheduled)
 *   invoice_incomplete→ payment_incomplete(flag for review, never release)
 *
 * Unknown statuses are treated conservatively: no release, no state change
 * beyond a logged note.
 */
export function mapInvoiceStatus(raw: string): StatusMapping | null {
  switch (raw) {
    case 'invoice_pending':
      return {
        paymentStatus: 'pending',
        ledgerEvent: 'payment_pending',
        releasesJob: false,
        flagForReview: false,
      };
    case 'invoice_confirmed':
      return {
        paymentStatus: 'confirmed',
        ledgerEvent: 'payment_confirmed',
        releasesJob: true,
        flagForReview: false,
      };
    case 'invoice_complete':
      return {
        paymentStatus: 'complete',
        ledgerEvent: 'paid',
        releasesJob: true,
        flagForReview: false,
      };
    case 'invoice_incomplete':
      return {
        paymentStatus: 'incomplete',
        ledgerEvent: 'payment_incomplete',
        releasesJob: false,
        flagForReview: true,
      };
    default:
      return null;
  }
}

/** Rank of a payment status, so repeated callbacks can only move forward. */
export function statusRank(status: PaymentStatus): number {
  switch (status) {
    case 'pending':
      return 1;
    case 'confirmed':
      return 2;
    case 'complete':
      return 3;
    case 'incomplete':
      return 0; // terminal-but-bad; handled explicitly, not by rank
  }
}
