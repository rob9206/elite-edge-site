import type { PaymentGateway } from './types';
import { StubGateway } from './stub';
import { LiveUniwireGateway } from './live';

export * from './types';
export { signRequest, verifyWebhookSignature, computeWebhookSignature } from './sign';
export { mapInvoiceStatus, statusRank } from './status';

let cached: PaymentGateway | undefined;

/**
 * Resolve the active payment gateway from env.
 *   UNIWIRE_MODE=stub → in-process fake (default; no keys needed)
 *   UNIWIRE_MODE=live → real Uniwire client (requires API_KEY/SECRET/PROFILE_ID)
 */
export function getGateway(): PaymentGateway {
  if (cached) return cached;

  const mode = process.env.UNIWIRE_MODE === 'live' ? 'live' : 'stub';
  const webhookSecret = process.env.UNIWIRE_WEBHOOK_SECRET ?? '';

  if (mode === 'live') {
    const apiKey = process.env.UNIWIRE_API_KEY;
    const apiSecret = process.env.UNIWIRE_API_SECRET;
    const profileId = process.env.UNIWIRE_PROFILE_ID;
    if (!apiKey || !apiSecret || !profileId || !webhookSecret) {
      throw new Error(
        'UNIWIRE_MODE=live requires UNIWIRE_API_KEY, UNIWIRE_API_SECRET, UNIWIRE_PROFILE_ID, and UNIWIRE_WEBHOOK_SECRET.',
      );
    }
    cached = new LiveUniwireGateway({
      apiBase: process.env.UNIWIRE_API_BASE ?? 'https://api.uniwire.com',
      apiKey,
      apiSecret,
      profileId,
      webhookSecret,
    });
  } else {
    cached = new StubGateway(webhookSecret || 'dev-webhook-secret');
  }

  return cached;
}

/** Test helper: reset the cached gateway (so env changes take effect). */
export function __resetGateway() {
  cached = undefined;
}
