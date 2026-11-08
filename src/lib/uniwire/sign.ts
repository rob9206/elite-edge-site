import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Sign a Uniwire request exactly as the API expects.
 *
 * Take the payload, add `request` (the endpoint path) and `nonce` (ms epoch),
 * JSON-stringify, base64-encode, then HMAC-SHA256 the base64 string with the
 * API secret. Returns the three headers Uniwire requires.
 *
 * SECURITY: only ever runs server-side. API_SECRET must never reach the client.
 */
export function signRequest(
  payload: Record<string, unknown>,
  endpoint: string,
  key: string,
  secret: string,
  nonce: number = Date.now(),
): { headers: Record<string, string>; payloadB64: string } {
  const body = { ...payload, request: endpoint, nonce };
  const payloadB64 = Buffer.from(JSON.stringify(body)).toString('base64');
  const signature = createHmac('sha256', secret).update(payloadB64).digest('hex');
  return {
    headers: {
      'X-CC-KEY': key,
      'X-CC-PAYLOAD': payloadB64,
      'X-CC-SIGNATURE': signature,
    },
    payloadB64,
  };
}

/** Compute the webhook signature for a raw body (HMAC-SHA256 hex of the body). */
export function computeWebhookSignature(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

/**
 * Constant-time verification of an inbound webhook signature against the raw
 * body. Returns false on any mismatch or malformed header.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = computeWebhookSignature(rawBody, secret);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signatureHeader.trim(), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
