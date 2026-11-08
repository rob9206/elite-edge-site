/** Which measurements each job type asks for on the intake form. Keys match
 *  the catalog's quantity rules so the estimate engine can consume them. */
export interface MeasurementField {
  key: string;
  label: string;
  unit: string;
}

export const MEASUREMENT_FIELDS: Record<string, MeasurementField[]> = {
  panel_upgrade: [
    { key: 'circuits', label: 'Circuits / breakers', unit: 'count' },
    { key: 'service_feet', label: 'Service cable run', unit: 'ft' },
    { key: 'labor_hours', label: 'Estimated labor', unit: 'hrs' },
  ],
  new_construction: [
    { key: 'square_feet', label: 'Conditioned area', unit: 'sq ft' },
    { key: 'devices', label: 'Outlets / switches / devices', unit: 'count' },
    { key: 'labor_hours', label: 'Estimated labor', unit: 'hrs' },
  ],
  remodel: [
    { key: 'circuits', label: 'New / rewired circuits', unit: 'count' },
    { key: 'fixtures', label: 'Fixtures (recessed, etc.)', unit: 'count' },
    { key: 'labor_hours', label: 'Estimated labor', unit: 'hrs' },
  ],
  troubleshooting: [
    { key: 'parts_lots', label: 'Repair parts lots', unit: 'count' },
    { key: 'labor_hours', label: 'Estimated labor', unit: 'hrs' },
  ],
  ev_charger: [
    { key: 'chargers', label: 'Chargers to install', unit: 'count' },
    { key: 'labor_hours', label: 'Estimated labor', unit: 'hrs' },
  ],
  surge_protection: [
    { key: 'labor_hours', label: 'Estimated labor', unit: 'hrs' },
  ],
};
