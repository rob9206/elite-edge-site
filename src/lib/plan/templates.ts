import type { TaskSpec } from './types';

/**
 * Per-job-type plan templates. Deterministic sequences of work.
 *
 * Design rule baked into every template so the hard constraint holds by
 * construction: a Steve task (complexity ≤ 2) is either dependency-free prep
 * OR terminal (it may depend on a Foti task, but nothing depends on it). That
 * guarantees no Foti task ever depends on a Steve task — Foti is never blocked
 * waiting on Steve. The engine still validates this at runtime.
 */
export const PLAN_TEMPLATES: Record<string, TaskSpec[]> = {
  panel_upgrade: [
    { key: 'permit', title: 'Pull permit & schedule utility disconnect', detail: 'File the electrical permit and coordinate the utility disconnect/reconnect window.', complexity: 3, estHours: 2, dependsOnKeys: [] },
    { key: 'stage', title: 'Stage materials & protect work area', detail: 'Deliver panel, breakers, and cable; lay protection and set up the work zone.', complexity: 1, estHours: 2, dependsOnKeys: [] },
    { key: 'demo', title: 'De-energize & remove old panel', detail: 'Confirm dead, document existing circuits, and remove the old panel.', complexity: 4, estHours: 3, dependsOnKeys: ['permit'] },
    { key: 'install', title: 'Mount & wire new 200A panel', detail: 'Set the new panel, run the service entrance, and land the feeders.', complexity: 5, estHours: 5, dependsOnKeys: ['demo'] },
    { key: 'energize', title: 'Terminate, torque & energize', detail: 'Torque to spec, verify phasing, and energize the panel.', complexity: 5, estHours: 3, dependsOnKeys: ['install'] },
    { key: 'label', title: 'Label circuits & clean up', detail: 'Create the panel directory, label circuits, and clean the work area.', complexity: 2, estHours: 2, dependsOnKeys: ['energize'] },
    { key: 'inspect', title: 'Inspection & sign-off', detail: 'Walk the inspection and collect the permit card.', complexity: 3, estHours: 2, dependsOnKeys: ['energize'] },
  ],

  new_construction: [
    { key: 'layout', title: 'Plan layout & device locations', detail: 'Mark device, panel, and home-run locations against the prints.', complexity: 4, estHours: 4, dependsOnKeys: [] },
    { key: 'permit', title: 'Pull permit', detail: 'File the electrical permit for the build.', complexity: 3, estHours: 1, dependsOnKeys: [] },
    { key: 'materials', title: 'Stage wire, boxes & devices', detail: 'Stage rough-in materials on each floor.', complexity: 1, estHours: 3, dependsOnKeys: [] },
    { key: 'rough', title: 'Rough-in wiring & boxes', detail: 'Pull home runs, set boxes, and wire circuits per layout.', complexity: 5, estHours: 16, dependsOnKeys: ['layout', 'permit'] },
    { key: 'rough_inspect', title: 'Rough inspection', detail: 'Walk the rough inspection before cover.', complexity: 3, estHours: 2, dependsOnKeys: ['rough'] },
    { key: 'trim', title: 'Trim-out: devices & fixtures', detail: 'Install devices, fixtures, and panel after drywall.', complexity: 4, estHours: 10, dependsOnKeys: ['rough_inspect'] },
    { key: 'final', title: 'Final inspection & sign-off', detail: 'Energize, test, and pass the final inspection.', complexity: 3, estHours: 3, dependsOnKeys: ['trim'] },
    { key: 'cleanup', title: 'Site cleanup & haul-off', detail: 'Remove scrap and clean each work area.', complexity: 1, estHours: 2, dependsOnKeys: ['trim'] },
  ],

  remodel: [
    { key: 'assess', title: 'Assess existing & plan circuits', detail: 'Evaluate existing wiring and plan new circuits/fixtures.', complexity: 4, estHours: 2, dependsOnKeys: [] },
    { key: 'permit', title: 'Pull permit', detail: 'File the permit for the remodel scope.', complexity: 3, estHours: 1, dependsOnKeys: [] },
    { key: 'demo', title: 'Demo & material staging', detail: 'Remove old fixtures/devices and stage new materials.', complexity: 2, estHours: 3, dependsOnKeys: ['assess'] },
    { key: 'rewire', title: 'Rewire & new circuits', detail: 'Pull new circuits, set boxes, and wire fixtures.', complexity: 5, estHours: 8, dependsOnKeys: ['permit', 'assess'] },
    { key: 'trim', title: 'Install fixtures & devices', detail: 'Mount recessed lighting, devices, and trim.', complexity: 4, estHours: 5, dependsOnKeys: ['rewire'] },
    { key: 'inspect', title: 'Inspection & sign-off', detail: 'Test, energize, and pass inspection.', complexity: 3, estHours: 2, dependsOnKeys: ['trim'] },
    { key: 'cleanup', title: 'Clean up', detail: 'Clean the work areas and haul debris.', complexity: 1, estHours: 1, dependsOnKeys: ['trim'] },
  ],

  troubleshooting: [
    { key: 'diagnose', title: 'Diagnose the fault', detail: 'Trace the issue and identify the root cause and fix.', complexity: 4, estHours: 2, dependsOnKeys: [] },
    { key: 'repair', title: 'Perform the repair', detail: 'Execute the repair and verify the circuit is sound.', complexity: 4, estHours: 2, dependsOnKeys: ['diagnose'] },
    { key: 'verify', title: 'Test & document', detail: 'Test under load, confirm resolution, and note the fix.', complexity: 2, estHours: 1, dependsOnKeys: ['repair'] },
  ],

  ev_charger: [
    { key: 'assess', title: 'Assess panel capacity & route', detail: 'Confirm panel capacity, choose the circuit, and plan the run.', complexity: 4, estHours: 1, dependsOnKeys: [] },
    { key: 'permit', title: 'Pull permit', detail: 'File the permit for the EVSE circuit.', complexity: 3, estHours: 1, dependsOnKeys: [] },
    { key: 'stage', title: 'Stage EVSE & materials', detail: 'Stage the charger, breaker, and conduit/wire.', complexity: 1, estHours: 1, dependsOnKeys: [] },
    { key: 'install', title: 'Install circuit & mount EVSE', detail: 'Run the 240V circuit, mount and wire the charger.', complexity: 5, estHours: 4, dependsOnKeys: ['assess', 'permit'] },
    { key: 'commission', title: 'Energize & commission', detail: 'Energize, test charging, and configure the unit.', complexity: 4, estHours: 1, dependsOnKeys: ['install'] },
    { key: 'inspect', title: 'Inspection & sign-off', detail: 'Pass inspection and hand off to the customer.', complexity: 3, estHours: 1, dependsOnKeys: ['commission'] },
  ],

  surge_protection: [
    { key: 'assess', title: 'Assess panel & SPD location', detail: 'Pick the mounting location and the breaker to pair with the SPD.', complexity: 3, estHours: 1, dependsOnKeys: [] },
    { key: 'install', title: 'Install surge protective device', detail: 'Mount the SPD, land conductors, and keep leads short.', complexity: 4, estHours: 2, dependsOnKeys: ['assess'] },
    { key: 'verify', title: 'Energize, test & label', detail: 'Energize, confirm status indicators, and label.', complexity: 2, estHours: 1, dependsOnKeys: ['install'] },
  ],
};

export function getPlanTemplate(jobType: string): TaskSpec[] | undefined {
  return PLAN_TEMPLATES[jobType];
}
