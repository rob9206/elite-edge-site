/** Estimate domain types. Money is integer cents; percentages are basis points. */

export type LineCategory = 'material' | 'labor' | 'permit' | 'equipment' | 'other';
export type LineSource = 'catalog' | 'manual';

/** A single estimate line. Stored (as an array) in Estimate.lineItems (jsonb). */
export interface LineItem {
  id: string;
  description: string;
  category: LineCategory;
  qty: number;
  unit: string; // "ea", "hr", "ft", "circuit", ...
  unitCostCents: number;
  markupBps: number;
  source: LineSource;
}

/** A line with its computed total (derived, never stored — always recomputable). */
export interface ComputedLine extends LineItem {
  /** round(qty * unitCostCents * (1 + markupBps/10000)) */
  lineTotalCents: number;
}

/** The fully computed estimate totals, derived from line items alone. */
export interface ComputedEstimate {
  lines: ComputedLine[];
  subtotalCents: number;
  contingencyBps: number;
  contingencyCents: number;
  taxBps: number;
  taxCents: number;
  totalCents: number;
}

/** How a catalog item's quantity is derived for a given job. */
export type QuantityRule =
  | { type: 'fixed'; value: number }
  | { type: 'measure'; key: string; factor?: number };

/** One seeded unit-cost entry for a job type. */
export interface CatalogItem {
  id: string;
  description: string;
  category: LineCategory;
  unit: string;
  unitCostCents: number;
  markupBps: number;
  quantity: QuantityRule;
}

/** Per-job-type configuration: the seeded cost table + markup/contingency/tax. */
export interface JobTypeConfig {
  key: string;
  label: string;
  contingencyBps: number;
  taxBps: number;
  items: CatalogItem[];
}
