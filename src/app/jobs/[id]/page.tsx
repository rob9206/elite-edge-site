import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { TopBar, JobBadge, TaskBadge, PaymentBadge, AssigneeBadge } from '@/components/ui';
import { formatUsd, formatPct } from '@/lib/money';
import { computeEstimate } from '@/lib/estimate/engine';
import { JOB_TYPES } from '@/lib/estimate/catalog';
import type { LineItem } from '@/lib/estimate/types';
import EstimateEditor from './EstimateEditor';
import {
  buildEstimateForm,
  approveEstimateForm,
  reassignForm,
  setTaskStatusForm,
  issueInvoiceForm,
  addNoteForm,
  closeJobForm,
} from './actions';

export const dynamic = 'force-dynamic';

export default async function JobPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      estimates: { orderBy: { revision: 'desc' } },
      plans: { include: { tasks: { orderBy: { orderIndex: 'asc' } } }, orderBy: { sequence: 'desc' }, take: 1 },
      payments: { orderBy: { createdAt: 'desc' } },
      ledger: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!job) notFound();

  const latest = job.estimates[0];
  const approved = job.estimates.find((e) => e.approvedAt) ?? null;
  const plan = job.plans[0] ?? null;
  const taskNumber = new Map(plan?.tasks.map((t, i) => [t.id, i + 1]) ?? []);

  const computed = latest
    ? computeEstimate(latest.lineItems as unknown as LineItem[], latest.contingencyBps, latest.taxBps)
    : null;

  return (
    <>
      <TopBar user={user} />
      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {searchParams.error && (
          <div className="rounded-md border border-edge-red/40 bg-edge-red/10 px-4 py-2 text-sm text-edge-red">
            {searchParams.error}
          </div>
        )}

        {/* HEADER */}
        <section className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display font-black uppercase text-2xl text-white">{job.customerName}</h1>
              <JobBadge status={job.status} />
            </div>
            <p className="text-ink-400 text-sm mt-1">
              {JOB_TYPES[job.jobType]?.label ?? job.jobType} · {job.address}
            </p>
            <p className="text-ink-500 text-sm mono mt-1">{job.phone} · {job.email}</p>
          </div>
          {isAdmin && job.status !== 'closed' && (
            <form action={closeJobForm}>
              <input type="hidden" name="jobId" value={job.id} />
              <button className="btn-ghost text-xs">Close job</button>
            </form>
          )}
        </section>

        <div className="hazard rounded" />

        {/* JOB DETAILS */}
        <section className="card p-5">
          <h2 className="font-display font-bold uppercase text-sm text-ink-300 mb-3">Request</h2>
          <p className="text-ink-200 text-sm whitespace-pre-wrap">{job.description}</p>
          {Object.keys(job.measurements as object).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(job.measurements as Record<string, unknown>).map(([k, v]) => (
                <span key={k} className="text-xs rounded bg-ink-750 px-2 py-1 text-ink-300 mono">
                  {k}: {String(v)}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ESTIMATE */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold uppercase text-sm text-ink-300">
              Estimate {latest ? `· rev ${latest.revision}` : ''}
            </h2>
            {approved && (
              <span className="text-xs text-edge-green">
                Approved by {approved.approvedBy} · {approved.approvedAt?.toISOString().slice(0, 10)}
              </span>
            )}
          </div>

          {!latest && (
            isAdmin ? (
              <form action={buildEstimateForm}>
                <input type="hidden" name="jobId" value={job.id} />
                <button className="btn-primary">Build estimate from catalog</button>
                <p className="text-xs text-ink-500 mt-2">
                  Generates line items from the seeded unit-cost table × this job’s measurements.
                </p>
              </form>
            ) : (
              <p className="text-ink-500 text-sm">No estimate yet.</p>
            )
          )}

          {latest && isAdmin && !approved && (
            <>
              <EstimateEditor
                jobId={job.id}
                initialLines={latest.lineItems as unknown as LineItem[]}
                initialContingencyBps={latest.contingencyBps}
                initialTaxBps={latest.taxBps}
              />
              <div className="mt-4 flex justify-end border-t border-ink-700 pt-4">
                <form action={approveEstimateForm}>
                  <input type="hidden" name="jobId" value={job.id} />
                  <input type="hidden" name="estimateId" value={latest.id} />
                  <button className="btn-primary">Approve &amp; generate plan</button>
                </form>
              </div>
            </>
          )}

          {latest && computed && (!isAdmin || approved) && (
            <EstimateView computed={computed} />
          )}
        </section>

        {/* PLAN / TASKS */}
        {plan && (
          <section className="card p-5">
            <h2 className="font-display font-bold uppercase text-sm text-ink-300 mb-4">
              Plan of action <span className="text-ink-500 normal-case">· dependency order</span>
            </h2>
            <div className="space-y-2">
              {plan.tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-md border border-ink-700 bg-ink-850 px-3 py-2">
                  <span className="mono text-ink-500 text-xs w-6">{taskNumber.get(t.id)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{t.title}</div>
                    <div className="text-ink-500 text-xs truncate">{t.detail}</div>
                    {t.dependsOn.length > 0 && (
                      <div className="text-ink-600 text-xs mono mt-0.5">
                        depends on #{t.dependsOn.map((d) => taskNumber.get(d) ?? '?').join(', #')}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-ink-500 mono">c{t.complexity}</span>
                  <AssigneeBadge who={t.assignedTo} />
                  <TaskBadge status={t.status} />

                  {/* Status controls: admin any task, crew only own tasks */}
                  {(isAdmin || t.assignedTo === 'steve') && t.status !== 'done' && (
                    <form action={setTaskStatusForm} className="flex gap-1">
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="taskId" value={t.id} />
                      <input type="hidden" name="status" value={t.status === 'pending' ? 'active' : 'done'} />
                      <button className="btn-ghost text-xs py-1">
                        {t.status === 'pending' ? 'Start' : 'Mark done'}
                      </button>
                    </form>
                  )}

                  {/* One-click reassign (admin only) */}
                  {isAdmin && (
                    <form action={reassignForm}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="taskId" value={t.id} />
                      <input type="hidden" name="assignedTo" value={t.assignedTo === 'foti' ? 'steve' : 'foti'} />
                      <button className="btn-ghost text-xs py-1" title="Reassign to the other crew member">⇄</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PAYMENTS */}
        <section className="card p-5">
          <h2 className="font-display font-bold uppercase text-sm text-ink-300 mb-4">Payments</h2>

          {job.payments.length > 0 && (
            <div className="space-y-2 mb-4">
              {job.payments.map((p) => (
                <div key={p.id} className="rounded-md border border-ink-700 bg-ink-850 px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <PaymentBadge status={p.status} />
                    <span className="mono text-white">{formatUsd(p.amountCents)}</span>
                    <span className="text-ink-500 text-xs">{p.kind}</span>
                    <span className="ml-auto text-ink-600 text-xs mono">{p.uniwireInvoiceId}</span>
                  </div>
                  {p.address && <div className="mono text-xs text-ink-400 mt-1 break-all">address: {p.address}</div>}
                  {p.lightningPaymentRequest && (
                    <div className="mono text-xs text-ink-400 mt-1 break-all">lightning: {p.lightningPaymentRequest}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAdmin && approved && job.status !== 'closed' ? (
            <form action={issueInvoiceForm} className="flex flex-wrap items-end gap-3 border-t border-ink-700 pt-4">
              <input type="hidden" name="jobId" value={job.id} />
              <input type="hidden" name="estimateId" value={approved.id} />
              <div>
                <label className="label">Amount (USD)</label>
                <input name="amountUsd" className="input mono w-32" placeholder="1500.00" />
              </div>
              <div>
                <label className="label">Method</label>
                <select name="kind" className="input w-44">
                  <option value="BTC_LIGHTNING">Lightning (BTC)</option>
                  <option value="BTC">On-chain (BTC)</option>
                </select>
              </div>
              <div className="flex-1 min-w-[12rem]">
                <label className="label">Notes (optional)</label>
                <input name="notes" className="input" placeholder="Progress payment, final bill…" />
              </div>
              <button className="btn-primary">Issue invoice</button>
            </form>
          ) : (
            !job.payments.length && (
              <p className="text-ink-500 text-sm">
                {approved ? 'Issue an invoice once signed in as Foti.' : 'Approve an estimate to enable invoicing.'}
              </p>
            )
          )}
        </section>

        {/* LEDGER */}
        <section className="card p-5">
          <h2 className="font-display font-bold uppercase text-sm text-ink-300 mb-4">
            Ledger <span className="text-ink-500 normal-case">· append-only</span>
          </h2>
          <ol className="space-y-2">
            {job.ledger.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="mono text-ink-600 text-xs whitespace-nowrap">
                  {e.createdAt.toISOString().replace('T', ' ').slice(0, 16)}
                </span>
                <span className="font-semibold text-ink-200 uppercase text-xs tracking-wide w-40">{e.event}</span>
                <span className="text-ink-500 text-xs">{e.actor}</span>
                <span className="text-ink-500 text-xs mono flex-1 truncate">{summarize(e.payload)}</span>
              </li>
            ))}
          </ol>

          <form action={addNoteForm} className="flex gap-2 mt-4 border-t border-ink-700 pt-4">
            <input type="hidden" name="jobId" value={job.id} />
            <input name="text" className="input flex-1" placeholder="Add a note to the ledger…" />
            <button className="btn-secondary">Add note</button>
          </form>
        </section>
      </main>
    </>
  );
}

function EstimateView({ computed }: { computed: ReturnType<typeof computeEstimate> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-ink-400 text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left font-semibold py-2">Description</th>
            <th className="text-right font-semibold py-2">Qty</th>
            <th className="text-right font-semibold py-2">Unit cost</th>
            <th className="text-right font-semibold py-2">Markup</th>
            <th className="text-right font-semibold py-2">Line total</th>
          </tr>
        </thead>
        <tbody>
          {computed.lines.map((l) => (
            <tr key={l.id} className="border-t border-ink-700">
              <td className="py-1.5 text-ink-200">
                {l.description}
                <span className="text-ink-600 text-xs ml-2">{l.category}</span>
              </td>
              <td className="py-1.5 text-right mono text-ink-300">{l.qty} {l.unit}</td>
              <td className="py-1.5 text-right mono text-ink-300">{formatUsd(l.unitCostCents)}</td>
              <td className="py-1.5 text-right mono text-ink-500">{formatPct(l.markupBps)}</td>
              <td className="py-1.5 text-right mono text-white">{formatUsd(l.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="text-sm">
          <tr className="border-t border-ink-700"><td colSpan={4} className="py-1 text-right text-ink-400">Subtotal</td><td className="py-1 text-right mono text-white">{formatUsd(computed.subtotalCents)}</td></tr>
          <tr><td colSpan={4} className="py-1 text-right text-ink-400">Contingency ({formatPct(computed.contingencyBps)})</td><td className="py-1 text-right mono text-ink-200">{formatUsd(computed.contingencyCents)}</td></tr>
          <tr><td colSpan={4} className="py-1 text-right text-ink-400">Tax ({formatPct(computed.taxBps)})</td><td className="py-1 text-right mono text-ink-200">{formatUsd(computed.taxCents)}</td></tr>
          <tr className="border-t border-ink-700"><td colSpan={4} className="py-2 text-right font-display font-bold uppercase text-white">Total</td><td className="py-2 text-right mono text-gold text-lg font-bold">{formatUsd(computed.totalCents)}</td></tr>
        </tfoot>
      </table>
    </div>
  );
}

function summarize(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const obj = payload as Record<string, unknown>;
  return Object.entries(obj)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' ');
}
