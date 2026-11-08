'use client';

import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { saveEstimateAction } from '@/app/actions/estimate';
import type { LineItem, LineCategory } from '@/lib/estimate/types';
import { formatUsd } from '@/lib/money';

const CATEGORIES: LineCategory[] = ['material', 'labor', 'permit', 'equipment', 'other'];

function lineTotalCents(l: LineItem): number {
  return Math.round(l.qty * l.unitCostCents * (1 + l.markupBps / 10_000));
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? 'Saving…' : 'Save estimate'}
    </button>
  );
}

export default function EstimateEditor({
  jobId,
  initialLines,
  initialContingencyBps,
  initialTaxBps,
}: {
  jobId: string;
  initialLines: LineItem[];
  initialContingencyBps: number;
  initialTaxBps: number;
}) {
  const [lines, setLines] = useState<LineItem[]>(initialLines);
  const [contingencyPct, setContingencyPct] = useState(initialContingencyBps / 100);
  const [taxPct, setTaxPct] = useState(initialTaxBps / 100);
  const [state, action] = useFormState(saveEstimateAction, { error: '' as string });

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + lineTotalCents(l), 0);
    const contingency = Math.round((subtotal * contingencyPct) / 100);
    const tax = Math.round(((subtotal + contingency) * taxPct) / 100);
    return { subtotal, contingency, tax, total: subtotal + contingency + tax };
  }, [lines, contingencyPct, taxPct]);

  const update = (i: number, patch: Partial<LineItem>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));
  const addManual = () =>
    setLines((ls) => [
      ...ls,
      {
        id: `manual_${Date.now()}`,
        description: '',
        category: 'other',
        qty: 1,
        unit: 'ea',
        unitCostCents: 0,
        markupBps: 0,
        source: 'manual',
      },
    ]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="lineItems" value={JSON.stringify(lines)} />
      <input type="hidden" name="contingencyBps" value={Math.round(contingencyPct * 100)} />
      <input type="hidden" name="taxBps" value={Math.round(taxPct * 100)} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] text-sm" aria-label="Estimate line items">
          <thead className="bg-stone-50 text-xs text-neutral-600">
            <tr>
              <th className="text-left font-semibold py-2">Description</th>
              <th className="text-right font-semibold py-2">Qty</th>
              <th className="text-left font-semibold py-2 pl-2">Unit</th>
              <th className="text-right font-semibold py-2">Unit cost</th>
              <th className="text-right font-semibold py-2">Markup %</th>
              <th className="text-right font-semibold py-2">Line total</th>
              <th><span className="sr-only">Remove line</span></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.id} className="border-t border-stone-200">
                <td className="py-1.5 pr-2">
                  <input
                    aria-label={`Description, line ${i + 1}`}
                    className="input min-w-[10rem] py-1"
                    value={l.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                  />
                  <select
                    aria-label={`Category, line ${i + 1}`}
                    className="mt-1 rounded bg-transparent text-xs text-neutral-600"
                    value={l.category}
                    onChange={(e) => update(i, { category: e.target.value as LineCategory })}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c} className="bg-white">{c}</option>)}
                  </select>
                </td>
                <td className="py-1.5">
                  <input
                    type="number" min="0" step="any"
                    className="input py-1 w-20 text-right mono"
                    aria-label={`Quantity, line ${i + 1}`}
                    value={l.qty}
                    onChange={(e) => update(i, { qty: Number(e.target.value) })}
                  />
                </td>
                <td className="py-1.5 pl-2">
                  <input
                    className="input py-1 w-16"
                    aria-label={`Unit, line ${i + 1}`}
                    value={l.unit}
                    onChange={(e) => update(i, { unit: e.target.value })}
                  />
                </td>
                <td className="py-1.5">
                  <input
                    type="number" min="0" step="0.01"
                    className="input py-1 w-28 text-right mono"
                    aria-label={`Unit cost in dollars, line ${i + 1}`}
                    value={(l.unitCostCents / 100).toString()}
                    onChange={(e) => update(i, { unitCostCents: Math.round(Number(e.target.value) * 100) })}
                  />
                </td>
                <td className="py-1.5">
                  <input
                    type="number" min="0" step="any"
                    className="input py-1 w-20 text-right mono"
                    aria-label={`Markup percent, line ${i + 1}`}
                    value={(l.markupBps / 100).toString()}
                    onChange={(e) => update(i, { markupBps: Math.round(Number(e.target.value) * 100) })}
                  />
                </td>
                <td className="py-1.5 text-right mono text-neutral-900">{formatUsd(lineTotalCents(l))}</td>
                <td className="py-1.5 pl-2">
                  <button
                    type="button"
                    aria-label={`Remove line ${i + 1}`}
                    onClick={() => remove(i)}
                    className="rounded-md p-1 text-neutral-600 hover:bg-stone-100 hover:text-edge-red"
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addManual} className="btn-ghost text-xs">+ Add manual line</button>

      <div className="flex flex-col items-end gap-1 border-t border-stone-200 pt-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-neutral-600">Subtotal</span>
          <span className="mono w-28 text-right text-neutral-900">{formatUsd(totals.subtotal)}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-neutral-600" htmlFor="estimate-contingency">Contingency %</label>
          <input id="estimate-contingency" type="number" min="0" step="any" className="input py-0.5 w-16 text-right mono"
            value={contingencyPct} onChange={(e) => setContingencyPct(Number(e.target.value))} />
          <span className="mono w-28 text-right text-neutral-800">{formatUsd(totals.contingency)}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-neutral-600" htmlFor="estimate-tax">Tax %</label>
          <input id="estimate-tax" type="number" min="0" step="any" className="input py-0.5 w-16 text-right mono"
            value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))} />
          <span className="mono w-28 text-right text-neutral-800">{formatUsd(totals.tax)}</span>
        </div>
        <div className="flex items-center gap-3 border-t border-stone-200 pt-1 mt-1">
          <span className="font-semibold text-neutral-900">Total</span>
          <span className="mono w-28 text-right text-neutral-900 text-lg font-bold">{formatUsd(totals.total)}</span>
        </div>
      </div>

      {state?.error ? <p className="text-sm text-edge-red text-right">{state.error}</p> : null}
      <div className="flex justify-end"><SaveButton /></div>
    </form>
  );
}
