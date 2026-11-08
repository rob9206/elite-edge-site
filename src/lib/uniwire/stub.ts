import { createHash } from 'node:crypto';
import type {
  CreateInvoiceParams,
  PaymentGateway,
  UniwireInvoice,
  UniwireWebhookEvent,
} from './types';
import { verifyWebhookSignature } from './sign';

/**
 * In-process fake gateway. No network, no keys. Deterministic outputs so the
 * whole pipeline is testable before real Uniwire credentials exist.
 *
 * Invoice ids are derived from the job/estimate so re-issuing is stable in dev.
 * Webhook verification uses the same HMAC scheme as the live gateway, so
 * idempotency/signature tests exercise real verification logic.
 */
export class StubGateway implements PaymentGateway {
  readonly mode = 'stub' as const;
  constructor(private readonly webhookSecret: string) {}

  async createInvoice(params: CreateInvoiceParams): Promise<UniwireInvoice> {
    if (!params.amountUsd || Number(params.amountUsd) <= 0) {
      throw new Error('Invoice amount must be a positive decimal string.');
    }
    const invoiceId =
      'stub_' +
      createHash('sha256')
        .update(`${params.jobId}:${params.estimateId}:${params.kind}:${params.amountUsd}`)
        .digest('hex')
        .slice(0, 24);

    const base: UniwireInvoice = {
      invoiceId,
      kind: params.kind,
      amountUsd: params.amountUsd,
      currency: 'USD',
      status: 'invoice_pending',
    };
    if (params.kind === 'BTC_LIGHTNING') {
      base.lightning = {
        payment_request:
          'lnbc' + invoiceId.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 40),
      };
    } else {
      base.address = 'bc1qstub' + invoiceId.slice(5, 29);
    }
    return base;
  }

  verifyWebhook(rawBody: string, signatureHeader: string | null): UniwireWebhookEvent | null {
    if (!verifyWebhookSignature(rawBody, signatureHeader, this.webhookSecret)) {
      return null;
    }
    return parseWebhookBody(rawBody);
  }
}

/** Parse a verified webhook body into our event shape. Shared by stub + live. */
export function parseWebhookBody(rawBody: string): UniwireWebhookEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  const event = (obj.event ?? obj) as Record<string, unknown>;
  const data = (event.data ?? event) as Record<string, unknown>;

  const invoiceId =
    (data.invoice_id as string) ?? (data.id as string) ?? (obj.invoice_id as string);
  const status = (data.status as string) ?? (event.type as string);
  if (!invoiceId || !status) return null;

  let passthrough: { job_id?: string; estimate_id?: string } | undefined;
  const ptRaw = data.passthrough ?? event.passthrough;
  if (typeof ptRaw === 'string') {
    try {
      passthrough = JSON.parse(ptRaw);
    } catch {
      passthrough = undefined;
    }
  } else if (ptRaw && typeof ptRaw === 'object') {
    passthrough = ptRaw as { job_id?: string; estimate_id?: string };
  }

  return { invoiceId, status, passthrough, raw: parsed };
}
