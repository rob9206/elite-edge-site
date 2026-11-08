import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getGateway } from '@/lib/uniwire';
import { processWebhookEvent } from '@/lib/payments/process';
import { prismaPaymentRepo } from '@/lib/payments/repo';
import { verifyWebhookSignature } from '@/lib/uniwire/sign';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/uniwire
 *
 * Verifies the signature against the RAW body, then processes the event
 * idempotently. Returns 200 for anything we successfully record (so Uniwire
 * stops retrying), 401 only when the signature is invalid, 400 when the body
 * can't be parsed into an event.
 */
export async function POST(req: Request) {
  const hdrs = headers();
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`webhook:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const rawBody = await req.text();
  const signature =
    hdrs.get('x-cc-webhook-signature') ?? hdrs.get('x-cc-signature') ?? null;

  const gateway = getGateway();
  const event = gateway.verifyWebhook(rawBody, signature);
  if (!event) {
    // Distinguish bad signature from unparseable body for observability, without
    // leaking which it was to the caller beyond the status code.
    const secret = process.env.UNIWIRE_WEBHOOK_SECRET ?? 'dev-webhook-secret';
    const sigOk = verifyWebhookSignature(rawBody, signature, secret);
    return NextResponse.json(
      { error: sigOk ? 'unparseable' : 'invalid_signature' },
      { status: sigOk ? 400 : 401 },
    );
  }

  const result = await processWebhookEvent(event, prismaPaymentRepo, {
    signatureValid: true,
    rawBody,
  });

  return NextResponse.json({ ok: true, ...result });
}
