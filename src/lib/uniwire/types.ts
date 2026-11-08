import type { PaymentKind } from '@prisma/client';

/** Parameters for creating a Uniwire invoice. Amount is a decimal USD string. */
export interface CreateInvoiceParams {
  amountUsd: string; // decimal string, e.g. "1234.56" — never blank
  kind: PaymentKind; // BTC (on-chain) | BTC_LIGHTNING
  jobId: string;
  estimateId: string;
  notes?: string;
}

/** The subset of a Uniwire invoice this app depends on. */
export interface UniwireInvoice {
  invoiceId: string;
  kind: PaymentKind;
  amountUsd: string;
  currency: string;
  status: string; // raw Uniwire status, e.g. "invoice_pending"
  address?: string; // on-chain address (BTC)
  lightning?: { payment_request: string }; // bolt11 (BTC_LIGHTNING)
}

/** A parsed, verified inbound webhook event. */
export interface UniwireWebhookEvent {
  invoiceId: string;
  status: string;
  passthrough?: { job_id?: string; estimate_id?: string };
  raw: unknown;
}

/**
 * The payment gateway contract. The rest of the app depends only on this, so
 * the stub and the live Uniwire client are fully interchangeable and the app is
 * testable before real API keys exist.
 */
export interface PaymentGateway {
  readonly mode: 'stub' | 'live';
  createInvoice(params: CreateInvoiceParams): Promise<UniwireInvoice>;
  /** Verify a raw webhook body + signature; returns the event or null if invalid. */
  verifyWebhook(rawBody: string, signatureHeader: string | null): UniwireWebhookEvent | null;
}
