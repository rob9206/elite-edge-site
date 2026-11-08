import type { LedgerEvent, Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Append a ledger entry. The ledger is insert-only — there is no update path.
 * Pass a transaction client to keep the entry atomic with its state change.
 */
export async function appendLedger(
  db: Db,
  input: {
    jobId: string;
    event: LedgerEvent;
    actor: string;
    payload?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await db.ledgerEntry.create({
    data: {
      jobId: input.jobId,
      event: input.event,
      actor: input.actor,
      payload: input.payload ?? {},
    },
  });
}
