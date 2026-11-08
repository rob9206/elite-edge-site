import { PrismaClient } from '@prisma/client';
import { buildDraftEstimate } from '../src/lib/estimate/engine';
import { generatePlan } from '../src/lib/plan/engine';
import { getGateway } from '../src/lib/uniwire';
import { dollarsToCents, centsToDecimalString } from '../src/lib/money';

const prisma = new PrismaClient();

async function main() {
  // This script DELETES all jobs/estimates/plans/payments/ledger rows. Dev only.
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== '1') {
    throw new Error('Refusing to run: demo seed wipes data. Set ALLOW_DEMO_SEED=1 (non-production only).');
  }
  // Clean slate for demo data (keep users).
  await prisma.paymentCallback.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.estimate.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.job.deleteMany();

  // ── Job A: fresh intake (draft) ────────────────────────────────
  const a = await prisma.job.create({
    data: {
      customerName: 'Dana Reyes', phone: '(555) 210-8841', email: 'dana@example.com',
      address: '418 Maplewood Dr', jobType: 'troubleshooting',
      description: 'Half the kitchen outlets went dead and a breaker keeps tripping.',
      measurements: { labor_hours: 3, parts_lots: 1 }, status: 'draft',
    },
  });
  await prisma.ledgerEntry.create({ data: { jobId: a.id, event: 'created', actor: 'customer', payload: { source: 'public_intake' } } });

  // ── Job B: estimated, awaiting approval ────────────────────────
  const b = await prisma.job.create({
    data: {
      customerName: 'Ridgeline Builders', phone: '(555) 773-0192', email: 'ops@ridgeline.example',
      address: '77 Summit Ridge — Lot 12', jobType: 'new_construction',
      description: 'Full electrical rough-in + trim for a 3,400 sq ft custom home.',
      measurements: { square_feet: 3400, devices: 92, labor_hours: 120 }, status: 'estimated',
    },
  });
  const bEst = buildDraftEstimate('new_construction', { square_feet: 3400, devices: 92, labor_hours: 120 });
  await prisma.estimate.create({
    data: {
      jobId: b.id, lineItems: bEst.lines.map(({ lineTotalCents, ...l }) => l) as object,
      subtotalCents: bEst.subtotalCents, contingencyBps: bEst.contingencyBps, contingencyCents: bEst.contingencyCents,
      taxBps: bEst.taxBps, taxCents: bEst.taxCents, totalCents: bEst.totalCents, revision: 1,
    },
  });
  await prisma.ledgerEntry.create({ data: { jobId: b.id, event: 'created', actor: 'customer', payload: {} } });
  await prisma.ledgerEntry.create({ data: { jobId: b.id, event: 'estimated', actor: 'foti', payload: { totalCents: bEst.totalCents } } });

  // ── Job C: approved → plan → invoice → confirmed (scheduled) ───
  const c = await prisma.job.create({
    data: {
      customerName: 'Marcus & Lena Webb', phone: '(555) 348-2253', email: 'webb.home@example.com',
      address: '1290 Oakfield Ln', jobType: 'panel_upgrade',
      description: '100A → 200A service upgrade; adding capacity for an EV charger next year.',
      measurements: { circuits: 24, service_feet: 45, labor_hours: 9 }, status: 'approved',
    },
  });
  const cEst = buildDraftEstimate('panel_upgrade', { circuits: 24, service_feet: 45, labor_hours: 9 });
  const cEstRow = await prisma.estimate.create({
    data: {
      jobId: c.id, lineItems: cEst.lines.map(({ lineTotalCents, ...l }) => l) as object,
      subtotalCents: cEst.subtotalCents, contingencyBps: cEst.contingencyBps, contingencyCents: cEst.contingencyCents,
      taxBps: cEst.taxBps, taxCents: cEst.taxCents, totalCents: cEst.totalCents, revision: 1,
      approvedBy: 'foti', approvedAt: new Date('2026-11-06T15:30:00Z'),
    },
  });
  await prisma.ledgerEntry.createMany({ data: [
    { jobId: c.id, event: 'created', actor: 'customer', payload: {} },
    { jobId: c.id, event: 'estimated', actor: 'foti', payload: { totalCents: cEst.totalCents } },
    { jobId: c.id, event: 'approved', actor: 'foti', payload: { totalCents: cEst.totalCents } },
  ] });

  // Plan + tasks (dependency order, complexity-assigned)
  const planned = generatePlan('panel_upgrade');
  const plan = await prisma.plan.create({ data: { jobId: c.id, estimateId: cEstRow.id, sequence: 1 } });
  const keyToId = new Map<string, string>();
  for (const t of planned) {
    const row = await prisma.task.create({ data: {
      planId: plan.id, jobId: c.id, title: t.title, detail: t.detail, complexity: t.complexity,
      assignedTo: t.assignedTo, estHours: t.estHours, orderIndex: t.orderIndex, status: 'pending', dependsOn: [],
    } });
    keyToId.set(t.key, row.id);
  }
  for (const t of planned) {
    const deps = t.dependsOnKeys.map((k) => keyToId.get(k)!);
    if (deps.length) await prisma.task.update({ where: { id: keyToId.get(t.key)! }, data: { dependsOn: deps } });
    await prisma.ledgerEntry.create({ data: { jobId: c.id, event: 'assigned', actor: 'foti', payload: { task: t.title, assignedTo: t.assignedTo, complexity: t.complexity } } });
  }
  // Steve started the first prep task
  const stage = keyToId.get('stage')!;
  await prisma.task.update({ where: { id: stage }, data: { status: 'active' } });

  // Issue a manual-amount invoice via the stub gateway, then confirm it
  const amountUsd = centsToDecimalString(Math.round(cEst.totalCents / 2)); // partial progress payment
  const gw = getGateway();
  const inv = await gw.createInvoice({ amountUsd, kind: 'BTC_LIGHTNING', jobId: c.id, estimateId: cEstRow.id });
  await prisma.payment.create({ data: {
    jobId: c.id, estimateId: cEstRow.id, uniwireInvoiceId: inv.invoiceId, kind: 'BTC_LIGHTNING',
    amountCents: dollarsToCents(amountUsd), currency: 'USD', status: 'confirmed',
    lightningPaymentRequest: inv.lightning?.payment_request ?? null,
  } });
  await prisma.paymentCallback.create({ data: { uniwireInvoiceId: inv.invoiceId, status: 'invoice_confirmed', signatureValid: true, rawBody: '{"demo":true}' } });
  await prisma.ledgerEntry.createMany({ data: [
    { jobId: c.id, event: 'payment_pending', actor: 'foti', payload: { invoiceId: inv.invoiceId, amountUsd } },
    { jobId: c.id, event: 'payment_confirmed', actor: 'uniwire', payload: { invoiceId: inv.invoiceId } },
  ] });
  await prisma.job.update({ where: { id: c.id }, data: { status: 'scheduled' } });

  console.log('Demo data loaded: 3 jobs (draft, estimated, approved+scheduled).');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
