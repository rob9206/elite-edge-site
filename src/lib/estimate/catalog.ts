import type { CatalogItem, JobTypeConfig } from './types';

/**
 * Seeded unit-cost catalog. This is the deterministic source of truth for
 * estimates — line items come from here, multiplied by measured quantities.
 * Prices are illustrative starting points; Foti tunes them per market.
 *
 * `quantity.measure.key` reads Job.measurements[key] (a number the intake form
 * or Foti supplies). Missing measurements default to 0, producing a 0-qty line
 * that Foti can edit or delete. Nothing here is LLM-guessed at estimate time.
 */

const h = (
  id: string,
  description: string,
  rateCentsPerHour: number,
  qtyKey: string,
  markupBps = 0,
): CatalogItem => ({
  id,
  description,
  category: 'labor',
  unit: 'hr',
  unitCostCents: rateCentsPerHour,
  markupBps,
  quantity: { type: 'measure', key: qtyKey },
});

export const JOB_TYPES: Record<string, JobTypeConfig> = {
  panel_upgrade: {
    key: 'panel_upgrade',
    label: 'Panel Upgrade',
    contingencyBps: 1000, // 10%
    taxBps: 800, // 8%
    items: [
      {
        id: 'panel_200a',
        description: '200A main panel (meter/main combo)',
        category: 'material',
        unit: 'ea',
        unitCostCents: 48000,
        markupBps: 2000, // 20%
        quantity: { type: 'fixed', value: 1 },
      },
      {
        id: 'breakers',
        description: 'Circuit breakers',
        category: 'material',
        unit: 'ea',
        unitCostCents: 1800,
        markupBps: 2000,
        quantity: { type: 'measure', key: 'circuits' },
      },
      {
        id: 'service_cable',
        description: 'Service entrance cable',
        category: 'material',
        unit: 'ft',
        unitCostCents: 650,
        markupBps: 1500,
        quantity: { type: 'measure', key: 'service_feet' },
      },
      {
        id: 'permit',
        description: 'Electrical permit & utility coordination',
        category: 'permit',
        unit: 'ea',
        unitCostCents: 25000,
        markupBps: 0,
        quantity: { type: 'fixed', value: 1 },
      },
      h('labor_panel', 'Licensed electrician labor', 11000, 'labor_hours'),
    ],
  },

  new_construction: {
    key: 'new_construction',
    label: 'New Construction',
    contingencyBps: 1500, // 15%
    taxBps: 800,
    items: [
      {
        id: 'rough_in',
        description: 'Rough-in wiring (per sq ft)',
        category: 'material',
        unit: 'sqft',
        unitCostCents: 450,
        markupBps: 1800,
        quantity: { type: 'measure', key: 'square_feet' },
      },
      {
        id: 'devices',
        description: 'Outlets, switches & devices',
        category: 'material',
        unit: 'ea',
        unitCostCents: 900,
        markupBps: 2000,
        quantity: { type: 'measure', key: 'devices' },
      },
      {
        id: 'panel_nc',
        description: '200A panel & distribution',
        category: 'material',
        unit: 'ea',
        unitCostCents: 52000,
        markupBps: 2000,
        quantity: { type: 'fixed', value: 1 },
      },
      {
        id: 'permit_nc',
        description: 'Permit & inspections',
        category: 'permit',
        unit: 'ea',
        unitCostCents: 45000,
        markupBps: 0,
        quantity: { type: 'fixed', value: 1 },
      },
      h('labor_nc', 'Crew labor', 10500, 'labor_hours'),
    ],
  },

  remodel: {
    key: 'remodel',
    label: 'Remodel',
    contingencyBps: 1500,
    taxBps: 800,
    items: [
      {
        id: 'rewire',
        description: 'Rewire / new circuits',
        category: 'material',
        unit: 'circuit',
        unitCostCents: 14000,
        markupBps: 1800,
        quantity: { type: 'measure', key: 'circuits' },
      },
      {
        id: 'fixtures',
        description: 'Recessed lighting & fixtures',
        category: 'material',
        unit: 'ea',
        unitCostCents: 3800,
        markupBps: 2000,
        quantity: { type: 'measure', key: 'fixtures' },
      },
      {
        id: 'permit_rm',
        description: 'Permit & inspection',
        category: 'permit',
        unit: 'ea',
        unitCostCents: 18000,
        markupBps: 0,
        quantity: { type: 'fixed', value: 1 },
      },
      h('labor_rm', 'Licensed electrician labor', 11000, 'labor_hours'),
    ],
  },

  troubleshooting: {
    key: 'troubleshooting',
    label: 'Troubleshooting',
    contingencyBps: 500, // 5%
    taxBps: 800,
    items: [
      {
        id: 'diagnostic',
        description: 'Diagnostic service call',
        category: 'labor',
        unit: 'ea',
        unitCostCents: 14500,
        markupBps: 0,
        quantity: { type: 'fixed', value: 1 },
      },
      h('labor_ts', 'Repair labor', 11000, 'labor_hours'),
      {
        id: 'parts_ts',
        description: 'Repair parts (estimated)',
        category: 'material',
        unit: 'lot',
        unitCostCents: 5000,
        markupBps: 2000,
        quantity: { type: 'measure', key: 'parts_lots' },
      },
    ],
  },

  ev_charger: {
    key: 'ev_charger',
    label: 'EV Charger',
    contingencyBps: 1000,
    taxBps: 800,
    items: [
      {
        id: 'evse',
        description: 'Level 2 EVSE unit',
        category: 'equipment',
        unit: 'ea',
        unitCostCents: 55000,
        markupBps: 1800,
        quantity: { type: 'measure', key: 'chargers' },
      },
      {
        id: 'circuit_ev',
        description: '240V dedicated circuit',
        category: 'material',
        unit: 'ea',
        unitCostCents: 22000,
        markupBps: 1800,
        quantity: { type: 'measure', key: 'chargers' },
      },
      {
        id: 'permit_ev',
        description: 'Permit & inspection',
        category: 'permit',
        unit: 'ea',
        unitCostCents: 15000,
        markupBps: 0,
        quantity: { type: 'fixed', value: 1 },
      },
      h('labor_ev', 'Installation labor', 11000, 'labor_hours'),
    ],
  },

  surge_protection: {
    key: 'surge_protection',
    label: 'Surge Protection',
    contingencyBps: 500,
    taxBps: 800,
    items: [
      {
        id: 'spd',
        description: 'Whole-home surge protective device',
        category: 'equipment',
        unit: 'ea',
        unitCostCents: 28000,
        markupBps: 2000,
        quantity: { type: 'fixed', value: 1 },
      },
      {
        id: 'permit_spd',
        description: 'Permit & inspection',
        category: 'permit',
        unit: 'ea',
        unitCostCents: 12000,
        markupBps: 0,
        quantity: { type: 'fixed', value: 1 },
      },
      h('labor_spd', 'Installation labor', 11000, 'labor_hours'),
    ],
  },
};

export const JOB_TYPE_KEYS = Object.keys(JOB_TYPES);

export function getJobTypeConfig(key: string): JobTypeConfig | undefined {
  return JOB_TYPES[key];
}
