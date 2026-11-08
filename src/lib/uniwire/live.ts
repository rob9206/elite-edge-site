import type {
  CreateInvoiceParams,
  PaymentGateway,
  UniwireInvoice,
  UniwireWebhookEvent,
} from './types';
import { signRequest, verifyWebhookSignature } from './sign';
import { parseWebhookBody } from './stub';

export interface LiveGatewayConfig {
  apiBase: string;
  apiKey: string;
  apiSecret: string;
  profileId: string;
  webhookSecret: string;
}

/**
 * Live Uniwire client. All calls are server-side only and HMAC-signed.
 * The API_SECRET never leaves this process.
 */
export class LiveUniwireGateway implements PaymentGateway {
  readonly mode = 'live' as const;
  constructor(private readonly cfg: LiveGatewayConfig) {}

  async createInvoice(params: CreateInvoiceParams): Promise<UniwireInvoice> {
    if (!params.amountUsd || Number(params.amountUsd) <= 0) {
      throw new Error('Invoice amount must be a positive decimal string.');
    }
    const endpoint = '/v1/invoices/';
    const payload = {
      profile_id: this.cfg.profileId,
      amount: params.amountUsd,
      currency: 'USD',
      kind: params.kind,
      passthrough: JSON.stringify({
        job_id: params.jobId,
        estimate_id: params.estimateId,
      }),
      notes: params.notes ?? '',
    };

    const { headers } = signRequest(
      payload,
      endpoint,
      this.cfg.apiKey,
      this.cfg.apiSecret,
    );

    const res = await fetch(this.cfg.apiBase + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Uniwire createInvoice failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const data = (await res.json()) as Record<string, any>;
    const inv = (data.invoice ?? data) as Record<string, any>;

    return {
      invoiceId: inv.invoice_id ?? inv.id,
      kind: params.kind,
      amountUsd: params.amountUsd,
      currency: inv.currency ?? 'USD',
      status: inv.status ?? 'invoice_pending',
      address: inv.address ?? inv.addresses?.[params.kind],
      lightning: inv.lightning
        ? { payment_request: inv.lightning.payment_request }
        : undefined,
    };
  }

  verifyWebhook(rawBody: string, signatureHeader: string | null): UniwireWebhookEvent | null {
    if (!verifyWebhookSignature(rawBody, signatureHeader, this.cfg.webhookSecret)) {
      return null;
    }
    return parseWebhookBody(rawBody);
  }
}
