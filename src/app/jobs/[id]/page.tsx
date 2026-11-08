import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { JobBadge, TaskBadge, PaymentBadge, AssigneeBadge } from '@/components/ui';
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
    <WorkspaceShell user={user} jobName={job.customerName} hasPlan={Boolean(plan)}>
      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {searchParams.error && (
          <div className="rounded-md border border-edge-red/40 bg-edge-red/10 px-4 py-2 text-sm text-edge-red">
            {searchParams.error}
          </div>
        )}

        {/* HEADER */}
        <section className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="break-words text-3xl font-semibold tracking-tight text-neutral-900">{job.customerName}</h1>
              <JobBadge status={job.status} />
            </div>
            <p className="text-neutral-600 text-sm mt-1">
              {JOB_TYPES[job.jobType]?.label ?? job.jobType} · {job.address}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-neutral-600"><a className="hover:underline" href={`tel:${job.phone}`}>{job.phone}</a><a className="break-all hover:underline" href={`mailto:${job.email}`}>{job.email}</a></p>
          </div>
          {isAdmin && job.status !== 'closed' && (
            <form action={closeJobForm}>
              <input type="hidden" name="jobId" value={job.id} />
              <button className="btn-ghost text-xs">Close job</button>
            </form>
          )}
        </section>

        {/* JOB DETAILS */}
        <section id="request" className="card min-w-0 p-4 sm:p-5">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900 mb-3">Request</h2>
          <p className="text-neutral-800 text-sm whitespace-pre-wrap">{job.description}</p>
          {Object.keys(job.measurements as object).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(job.measurements as Record<string, unknown>).map(([k, v]) => (
                <span key={k} className="rounded-md bg-stone-100 px-2 py-1 text-xs text-neutral-700">
                  {k}: {String(v)}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ESTIMATE */}
        <section id="estimate" className="card min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
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
                <p className="text-xs text-neutral-600 mt-2">
                  Uses catalog rates and the measurements on this request.
                </p>
              </form>
            ) : (
              <p className="text-neutral-600 text-sm">No estimate yet.</p>
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
              <div className="mt-4 flex justify-end border-t border-stone-200 pt-4">
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
          <section id="plan" className="card min-w-0 p-4 sm:p-5">
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900 mb-4">
              Plan of action
            </h2>
            <ol className="divide-y divide-stone-200">
              {plan.tasks.map((t) => (
                <li key={t.id} className="grid grid-cols-[1.6rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1.5 py-2 lg:grid-cols-[1.6rem_minmax(0,1fr)_auto]">
                  <span className="mt-0.5 text-xs tabular-nums text-neutral-500">{taskNumber.get(t.id)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-neutral-900 text-sm font-medium">{t.title}</div>
                    <div className="break-words text-xs leading-relaxed text-neutral-600">{t.detail}</div>
                    {t.dependsOn.length > 0 && (
                      <div className="text-neutral-500 text-xs mono mt-0.5">
                        Depends on #{t.dependsOn.map((d) => taskNumber.get(d) ?? '?').join(', #')}
                      </div>
                    )}
                  </div>
                  <div className="col-start-2 flex flex-wrap items-center gap-2 lg:col-start-3 lg:justify-end">
                    <span className="text-xs text-neutral-500" title="Task complexity">Level {t.complexity}</span>
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
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* PAYMENTS */}
        <section id="payments" className="card min-w-0 p-4 sm:p-5">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900 mb-4">Payments</h2>

          {job.payments.length > 0 && (
            <div className="mb-4 divide-y divide-stone-200">
              {job.payments.map((p) => (
                <div key={p.id} className="py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <PaymentBadge status={p.status} />
                    <span className="mono text-neutral-900">{formatUsd(p.amountCents)}</span>
                    <span className="text-neutral-600 text-xs">{p.kind}</span>
                    <span className="min-w-0 break-all text-xs text-neutral-500 sm:ml-auto">{p.uniwireInvoiceId}</span>
                  </div>
                  {p.address && <div className="mono text-xs text-neutral-600 mt-1 break-all">address: {p.address}</div>}
                  {p.lightningPaymentRequest && (
                    <div className="mono text-xs text-neutral-600 mt-1 break-all">lightning: {p.lightningPaymentRequest}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAdmin && approved && job.status !== 'closed' ? (
            <form action={issueInvoiceForm} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[8rem_10rem_minmax(0,1fr)_auto]">
              <input type="hidden" name="jobId" value={job.id} />
              <input type="hidden" name="estimateId" value={approved.id} />
              <div>
                <label className="label" htmlFor="invoice-amount">Amount (USD)</label>
                <input id="invoice-amount" name="amountUsd" inputMode="decimal" className="input tabular-nums" placeholder="1500.00" />
              </div>
              <div>
                <label className="label" htmlFor="invoice-method">Method</label>
                <select id="invoice-method" name="kind" className="input">
                  <option value="BTC_LIGHTNING">Lightning (BTC)</option>
                  <option value="BTC">On-chain (BTC)</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className="label" htmlFor="invoice-notes">Notes (optional)</label>
                <input id="invoice-notes" name="notes" className="input" placeholder="Progress payment, final bill…" />
              </div>
              <button className="btn-primary">Issue invoice</button>
            </form>
          ) : (
            !job.payments.length && (
              <p className="text-neutral-600 text-sm">
                {approved ? 'Issue an invoice once signed in as Foti.' : 'Approve an estimate to enable invoicing.'}
              </p>
            )
          )}
        </section>

        {/* LEDGER */}
        <section id="ledger" className="card min-w-0 p-4 sm:p-5">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900 mb-4">
            Job ledger
          </h2>
          <ol className="divide-y divide-stone-200">
            {job.ledger.map((entry) => {
              const details = summarize(entry.payload);
              const note = entry.event === 'note' && entry.payload && typeof entry.payload === 'object'
                && 'text' in entry.payload && typeof entry.payload.text === 'string'
                ? entry.payload.text : null;
              return (
                <li key={entry.id} className="grid gap-x-4 gap-y-1 py-2 text-sm md:grid-cols-[9rem_1fr]">
                  <time dateTime={entry.createdAt.toISOString()} className="text-xs text-neutral-500">
                    {entry.createdAt.toISOString().replace('T', ' ').slice(0, 16)} UTC
                  </time>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium capitalize text-neutral-900">{entry.event.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-neutral-500">{entry.actor}</span>
                    </div>
                    {note ? (
                      <p className="whitespace-pre-wrap break-words text-sm text-neutral-700">{note}</p>
                    ) : details && (
                      <details className="mt-1 text-xs text-neutral-600">
                        <summary className="w-fit cursor-pointer">Details</summary>
                        <p className="mt-1 whitespace-pre-wrap break-words">{details}</p>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <form action={addNoteForm} className="flex gap-2 mt-4 border-t border-stone-200 pt-4">
            <input type="hidden" name="jobId" value={job.id} />
            <input name="text" aria-label="Ledger note" className="input min-w-0 flex-1" placeholder="Add a note to the ledger…" />
            <button className="btn-secondary">Add note</button>
          </form>
        </section>
      </main>
    </WorkspaceShell>
  );
}

function EstimateView({ computed }: { computed: ReturnType<typeof computeEstimate> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead className="bg-stone-50 text-xs text-neutral-600">
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
            <tr key={l.id} className="border-t border-stone-200">
              <td className="py-1.5 text-neutral-800">
                {l.description}
                <span className="text-neutral-500 text-xs ml-2">{l.category}</span>
              </td>
              <td className="py-1.5 text-right mono text-neutral-700">{l.qty} {l.unit}</td>
              <td className="py-1.5 text-right mono text-neutral-700">{formatUsd(l.unitCostCents)}</td>
              <td className="py-1.5 text-right mono text-neutral-600">{formatPct(l.markupBps)}</td>
              <td className="py-1.5 text-right mono text-neutral-900">{formatUsd(l.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="text-sm">
          <tr className="border-t border-stone-200"><td colSpan={4} className="py-1 text-right text-neutral-600">Subtotal</td><td className="py-1 text-right mono text-neutral-900">{formatUsd(computed.subtotalCents)}</td></tr>
          <tr><td colSpan={4} className="py-1 text-right text-neutral-600">Contingency ({formatPct(computed.contingencyBps)})</td><td className="py-1 text-right mono text-neutral-800">{formatUsd(computed.contingencyCents)}</td></tr>
          <tr><td colSpan={4} className="py-1 text-right text-neutral-600">Tax ({formatPct(computed.taxBps)})</td><td className="py-1 text-right mono text-neutral-800">{formatUsd(computed.taxCents)}</td></tr>
          <tr className="border-t border-stone-200"><td colSpan={4} className="py-2 text-right font-semibold text-neutral-900">Total</td><td className="py-2 text-right mono text-neutral-900 text-lg font-bold">{formatUsd(computed.totalCents)}</td></tr>
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
