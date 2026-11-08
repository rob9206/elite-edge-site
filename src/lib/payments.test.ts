import { describe, it, expect, beforeEach } from 'vitest';
import type { JobStatus, LedgerEvent, PaymentStatus } from '@prisma/client';
import { signRequest, verifyWebhookSignature, computeWebhookSignature } from './uniwire/sign';
import { mapInvoiceStatus } from './uniwire/status';
import { StubGateway, parseWebhookBody } from './uniwire/stub';
import { processWebhookEvent, type PaymentRepo } from './payments/process';

describe('uniwire signing', () => {
  it('produces the three required headers with a hex HMAC', () => {
    const { headers, payloadB64 } = signRequest(
      { amount: '100.00' },
      '/v1/invoices/',
      'key_123',
      'secret_abc',
      1700000000000,
    );
    expect(headers['X-CC-KEY']).toBe('key_123');
    expect(headers['X-CC-PAYLOAD']).toBe(payloadB64);
    expect(headers['X-CC-SIGNATURE']).toMatch(/^[0-9a-f]{64}$/);
    // Payload is base64 of JSON containing request + nonce.
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    expect(decoded.request).toBe('/v1/invoices/');
    expect(decoded.nonce).toBe(1700000000000);
    expect(decoded.amount).toBe('100.00');
  });

  it('verifies webhook signatures in constant time and rejects tampering', () => {
    const body = JSON.stringify({ invoice_id: 'inv_1', status: 'invoice_confirmed' });
    const sig = computeWebhookSignature(body, 'wh_secret');
    expect(verifyWebhookSignature(body, sig, 'wh_secret')).toBe(true);
    expect(verifyWebhookSignature(body, sig, 'wrong_secret')).toBe(false);
    expect(verifyWebhookSignature(body + ' ', sig, 'wh_secret')).toBe(false);
    expect(verifyWebhookSignature(body, null, 'wh_secret')).toBe(false);
  });
});

describe('invoice status mapping', () => {
  it('maps statuses to ledger effects and release semantics', () => {
    expect(mapInvoiceStatus('invoice_pending')).toMatchObject({ releasesJob: false, flagForReview: false });
    expect(mapInvoiceStatus('invoice_confirmed')).toMatchObject({ releasesJob: true });
    expect(mapInvoiceStatus('invoice_complete')).toMatchObject({ ledgerEvent: 'paid', releasesJob: true });
    expect(mapInvoiceStatus('invoice_incomplete')).toMatchObject({ flagForReview: true, releasesJob: false });
    expect(mapInvoiceStatus('nonsense')).toBeNull();
  });
});

describe('stub gateway', () => {
  it('refuses a blank or zero amount', async () => {
    const gw = new StubGateway('wh');
    await expect(
      gw.createInvoice({ amountUsd: '', kind: 'BTC', jobId: 'j', estimateId: 'e' }),
    ).rejects.toThrow();
    await expect(
      gw.createInvoice({ amountUsd: '0', kind: 'BTC', jobId: 'j', estimateId: 'e' }),
    ).rejects.toThrow();
  });

  it('returns an address for BTC and a payment_request for lightning', async () => {
    const gw = new StubGateway('wh');
    const onchain = await gw.createInvoice({ amountUsd: '100.00', kind: 'BTC', jobId: 'j', estimateId: 'e' });
    expect(onchain.address).toBeTruthy();
    expect(onchain.lightning).toBeUndefined();
    const ln = await gw.createInvoice({ amountUsd: '100.00', kind: 'BTC_LIGHTNING', jobId: 'j', estimateId: 'e' });
    expect(ln.lightning?.payment_request).toMatch(/^lnbc/);
  });

  it('parses passthrough job/estimate ids from a webhook body', () => {
    const body = JSON.stringify({
      event: { data: { invoice_id: 'inv_9', status: 'invoice_confirmed', passthrough: JSON.stringify({ job_id: 'J', estimate_id: 'E' }) } },
    });
    const parsed = parseWebhookBody(body);
    expect(parsed).toMatchObject({ invoiceId: 'inv_9', status: 'invoice_confirmed', passthrough: { job_id: 'J', estimate_id: 'E' } });
  });
});

// ── In-memory repo for idempotency tests (acceptance #6, #7) ──
class FakeRepo implements PaymentRepo {
  payment = { id: 'p1', jobId: 'j1', status: 'pending' as PaymentStatus };
  jobStatus: JobStatus = 'approved';
  callbacks: string[] = [];
  ledger: LedgerEvent[] = [];

  async getPaymentByInvoiceId(invoiceId: string) {
    return invoiceId === 'inv_1' ? { ...this.payment } : null;
  }
  async recordCallback(input: { status: string }) {
    this.callbacks.push(input.status);
  }
  async updatePaymentStatus(_id: string, status: PaymentStatus) {
    this.payment.status = status;
  }
  async appendLedger(input: { event: LedgerEvent }) {
    this.ledger.push(input.event);
  }
  async getJobStatus() {
    return this.jobStatus;
  }
  async setJobStatus(_id: string, status: JobStatus) {
    this.jobStatus = status;
  }
}

describe('webhook processing (idempotency)', () => {
  let repo: FakeRepo;
  beforeEach(() => {
    repo = new FakeRepo();
  });

  it('applies a confirmation once across three replays (acceptance #6)', async () => {
    const event = { invoiceId: 'inv_1', status: 'invoice_confirmed', raw: {} };
    const opts = { signatureValid: true, rawBody: '{}' };
    const r1 = await processWebhookEvent(event, repo, opts);
    const r2 = await processWebhookEvent(event, repo, opts);
    const r3 = await processWebhookEvent(event, repo, opts);
    expect(r1.changed).toBe(true);
    expect(r2.changed).toBe(false);
    expect(r3.changed).toBe(false);
    expect(repo.callbacks).toHaveLength(3); // all three recorded for replay
    expect(repo.ledger.filter((e) => e === 'payment_confirmed')).toHaveLength(1);
    expect(repo.payment.status).toBe('confirmed');
    expect(repo.jobStatus).toBe('scheduled'); // released once
  });

  it('moves pending → confirmed → complete, each once', async () => {
    const opts = { signatureValid: true, rawBody: '{}' };
    await processWebhookEvent({ invoiceId: 'inv_1', status: 'invoice_confirmed', raw: {} }, repo, opts);
    const done = await processWebhookEvent({ invoiceId: 'inv_1', status: 'invoice_complete', raw: {} }, repo, opts);
    expect(done.changed).toBe(true);
    expect(repo.payment.status).toBe('complete');
    expect(repo.ledger).toContain('paid');
  });

  it('does not downgrade when an older status arrives late', async () => {
    const opts = { signatureValid: true, rawBody: '{}' };
    await processWebhookEvent({ invoiceId: 'inv_1', status: 'invoice_complete', raw: {} }, repo, opts);
    const late = await processWebhookEvent({ invoiceId: 'inv_1', status: 'invoice_pending', raw: {} }, repo, opts);
    expect(late.changed).toBe(false);
    expect(repo.payment.status).toBe('complete');
  });

  it('flags invoice_incomplete and does not change scheduling (acceptance #7)', async () => {
    const opts = { signatureValid: true, rawBody: '{}' };
    const r = await processWebhookEvent({ invoiceId: 'inv_1', status: 'invoice_incomplete', raw: {} }, repo, opts);
    expect(r.changed).toBe(true);
    expect(r.released).toBe(false);
    expect(repo.payment.status).toBe('incomplete');
    expect(repo.jobStatus).toBe('approved'); // NOT scheduled
    // Repeat is a no-op.
    const again = await processWebhookEvent({ invoiceId: 'inv_1', status: 'invoice_incomplete', raw: {} }, repo, opts);
    expect(again.changed).toBe(false);
  });

  it('records but ignores an unknown invoice', async () => {
    const r = await processWebhookEvent({ invoiceId: 'nope', status: 'invoice_confirmed', raw: {} }, repo, { signatureValid: true, rawBody: '{}' });
    expect(r.reason).toBe('unknown_invoice');
    expect(repo.callbacks).toHaveLength(1);
  });
});
