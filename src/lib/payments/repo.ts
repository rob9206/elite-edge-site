import { prisma } from '@/lib/db';
import type { PaymentRepo } from './process';

/** Prisma-backed PaymentRepo used by the webhook route. */
export const prismaPaymentRepo: PaymentRepo = {
  async getPaymentByInvoiceId(invoiceId) {
    const p = await prisma.payment.findUnique({
      where: { uniwireInvoiceId: invoiceId },
      select: { id: true, jobId: true, status: true },
    });
    return p;
  },
  async recordCallback(input) {
    await prisma.paymentCallback.create({
      data: {
        uniwireInvoiceId: input.invoiceId,
        paymentId: input.paymentId,
        status: input.status,
        signatureValid: input.signatureValid,
        rawBody: input.rawBody,
      },
    });
  },
  async updatePaymentStatus(paymentId, status) {
    await prisma.payment.update({ where: { id: paymentId }, data: { status } });
  },
  async appendLedger(input) {
    await prisma.ledgerEntry.create({
      data: {
        jobId: input.jobId,
        event: input.event,
        actor: input.actor,
        payload: input.payload as object,
      },
    });
  },
  async getJobStatus(jobId) {
    const j = await prisma.job.findUnique({ where: { id: jobId }, select: { status: true } });
    return j?.status ?? null;
  },
  async setJobStatus(jobId, status) {
    await prisma.job.update({ where: { id: jobId }, data: { status } });
  },
};
