import { describe, it, expect } from 'vitest';
import {
  computeEstimate,
  generateLineItems,
  buildDraftEstimate,
  lineTotalCents,
} from './estimate/engine';
import type { LineItem } from './estimate/types';

const line = (over: Partial<LineItem> = {}): LineItem => ({
  id: 'x',
  description: 'test',
  category: 'material',
  qty: 1,
  unit: 'ea',
  unitCostCents: 10_000,
  markupBps: 0,
  source: 'catalog',
  ...over,
});

describe('estimate engine', () => {
  it('computes a line total with markup, rounded to cents', () => {
    expect(lineTotalCents(line({ qty: 2, unitCostCents: 5000, markupBps: 2000 }))).toBe(
      12_000, // 2 * 5000 * 1.20
    );
    expect(lineTotalCents(line({ qty: 3, unitCostCents: 1800, markupBps: 1500 }))).toBe(
      6210, // round(3 * 1800 * 1.15 = 6210)
    );
  });

  it('total is recomputable from line items alone', () => {
    const items = [
      line({ id: 'a', qty: 1, unitCostCents: 48_000, markupBps: 2000 }), // 57,600
      line({ id: 'b', qty: 10, unitCostCents: 1800, markupBps: 2000 }), // 21,600
    ];
    const est = computeEstimate(items, 1000, 800);
    const subtotal = 57_600 + 21_600;
    expect(est.subtotalCents).toBe(subtotal);
    expect(est.contingencyCents).toBe(Math.round(subtotal * 0.1));
    expect(est.taxCents).toBe(Math.round((subtotal + est.contingencyCents) * 0.08));
    expect(est.totalCents).toBe(
      est.subtotalCents + est.contingencyCents + est.taxCents,
    );
    // Independently recompute from the returned lines.
    const reSub = est.lines.reduce((s, l) => s + l.lineTotalCents, 0);
    expect(reSub).toBe(est.subtotalCents);
  });

  it('generates catalog line items from measured quantities, dropping zeros', () => {
    const { lines } = generateLineItems('panel_upgrade', {
      circuits: 12,
      service_feet: 40,
      labor_hours: 8,
    });
    // panel (fixed) + breakers + service cable + permit (fixed) + labor = 5
    expect(lines).toHaveLength(5);
    const breakers = lines.find((l) => l.id === 'breakers');
    expect(breakers?.qty).toBe(12);
    // A measurement of 0 drops the line.
    const noCircuits = generateLineItems('panel_upgrade', { labor_hours: 8 });
    expect(noCircuits.lines.find((l) => l.id === 'breakers')).toBeUndefined();
  });

  it('is deterministic for identical inputs', () => {
    const a = buildDraftEstimate('remodel', { circuits: 3, fixtures: 6, labor_hours: 10 });
    const b = buildDraftEstimate('remodel', { circuits: 3, fixtures: 6, labor_hours: 10 });
    expect(a).toEqual(b);
  });

  it('supports manual override line items', () => {
    const manual: LineItem = line({
      id: 'manual_1',
      description: 'Custom trenching',
      qty: 1,
      unitCostCents: 30_000,
      markupBps: 1000,
      source: 'manual',
    });
    const est = buildDraftEstimate('surge_protection', {}, { manualLines: [manual] });
    expect(est.lines.some((l) => l.source === 'manual')).toBe(true);
    expect(est.lines.find((l) => l.id === 'manual_1')?.lineTotalCents).toBe(33_000);
  });

  it('throws on unknown job type', () => {
    expect(() => generateLineItems('not_a_type', {})).toThrow();
  });
});
