import { applyBps, roundCents } from '../money';
import { getJobTypeConfig } from './catalog';
import type {
  ComputedEstimate,
  ComputedLine,
  JobTypeConfig,
  LineItem,
} from './types';

/** Resolve a measurement value from a job's measurements map (missing -> 0). */
function measure(measurements: Record<string, unknown>, key: string): number {
  const v = measurements[key];
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Generate line items for a job from the seeded catalog × measured quantities.
 * Deterministic: same inputs always produce the same lines. Zero-quantity
 * catalog lines are dropped (Foti adds them back manually if needed).
 */
export function generateLineItems(
  jobType: string,
  measurements: Record<string, unknown>,
): { lines: LineItem[]; config: JobTypeConfig } {
  const config = getJobTypeConfig(jobType);
  if (!config) {
    throw new Error(`Unknown job type: ${jobType}`);
  }

  const lines: LineItem[] = [];
  for (const item of config.items) {
    let qty: number;
    if (item.quantity.type === 'fixed') {
      qty = item.quantity.value;
    } else {
      qty = measure(measurements, item.quantity.key) * (item.quantity.factor ?? 1);
    }
    if (qty <= 0) continue;
    lines.push({
      id: item.id,
      description: item.description,
      category: item.category,
      qty,
      unit: item.unit,
      unitCostCents: item.unitCostCents,
      markupBps: item.markupBps,
      source: 'catalog',
    });
  }

  return { lines, config };
}

/** round(qty * unitCost * (1 + markup)). The only place a line total is defined. */
export function lineTotalCents(line: LineItem): number {
  const base = line.qty * line.unitCostCents;
  const withMarkup = base * (1 + line.markupBps / 10_000);
  return roundCents(withMarkup);
}

/**
 * Compute an estimate's totals from line items alone. This is THE definition of
 * the total — it must be recomputable from the stored line items + the two
 * rates, with no hidden state. Used both to build and to re-verify estimates.
 */
export function computeEstimate(
  lineItems: LineItem[],
  contingencyBps: number,
  taxBps: number,
): ComputedEstimate {
  const lines: ComputedLine[] = lineItems.map((l) => ({
    ...l,
    lineTotalCents: lineTotalCents(l),
  }));

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const contingencyCents = applyBps(subtotalCents, contingencyBps);
  // Tax applies to subtotal + contingency.
  const taxCents = applyBps(subtotalCents + contingencyCents, taxBps);
  const totalCents = subtotalCents + contingencyCents + taxCents;

  return {
    lines,
    subtotalCents,
    contingencyBps,
    contingencyCents,
    taxBps,
    taxCents,
    totalCents,
  };
}

/**
 * Build a draft estimate for a job: catalog lines + any manual override lines,
 * with the job type's default contingency/tax (overridable by the caller).
 */
export function buildDraftEstimate(
  jobType: string,
  measurements: Record<string, unknown>,
  opts: {
    manualLines?: LineItem[];
    contingencyBps?: number;
    taxBps?: number;
  } = {},
): ComputedEstimate {
  const { lines, config } = generateLineItems(jobType, measurements);
  const allLines = [...lines, ...(opts.manualLines ?? [])];
  return computeEstimate(
    allLines,
    opts.contingencyBps ?? config.contingencyBps,
    opts.taxBps ?? config.taxBps,
  );
}
