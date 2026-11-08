import { describe, expect, it } from 'vitest';
import { buildBriefing, type BriefingSource } from './briefing';

const draft: BriefingSource = {
  description: 'Saved project scope', status: 'draft', estimateRevision: null,
  approvedRevision: null, planSequence: null, assignments: [], blockedCount: 0,
};

describe('job briefing', () => {
  it('shows missing records without inventing approval, crew, or delivery', () => {
    const result = buildBriefing(draft);
    expect(result.crew).toBe('No crew assignments recorded');
    expect(result.nodes.map((node) => node.detail)).toEqual(['Request saved', 'Not created', 'Not recorded', 'Delivery status not recorded']);
    expect(result.attention).toContain('No estimate has been saved.');
  });
  it('keeps the recorded scope without generating technical instructions', () => {
    expect(buildBriefing({ ...draft, description: '  Existing scope\nwith notes  ' }).scope).toBe('Existing scope\nwith notes');
    expect(buildBriefing({ ...draft, description: ' ' }).scope).toBe('No scope description recorded.');
  });
  it('deduplicates saved crew assignments', () => {
    expect(buildBriefing({ ...draft, assignments: ['foti', 'steve', 'foti'] }).crew).toBe('Foti + Steve');
  });
  it('flags unapproved and newer estimate revisions separately', () => {
    expect(buildBriefing({ ...draft, estimateRevision: 1 }).attention).toContain('Estimate approval is not recorded.');
    expect(buildBriefing({ ...draft, estimateRevision: 2, approvedRevision: 1 }).attention).toContain('Latest estimate is revision 2; approval is for revision 1.');
  });
  it('reports blocked records without exposing an interactive checklist', () => {
    expect(buildBriefing({ ...draft, blockedCount: 1 }).attention).toContain('1 blocked item is recorded');
    expect(buildBriefing({ ...draft, blockedCount: 2 }).attention).toContain('2 blocked items are recorded');
  });
  it('does not infer field completion from an approved plan', () => {
    const result = buildBriefing({ ...draft, status: 'approved', estimateRevision: 1, approvedRevision: 1, planSequence: 1 });
    expect(result.nodes[3].detail).toBe('Delivery status not recorded');
    expect(result.attention).toContain('Site readiness is not verified.');
  });
  it('flags an approved estimate without a saved plan', () => {
    expect(buildBriefing({ ...draft, estimateRevision: 1, approvedRevision: 1 }).attention).toContain('No saved plan is available.');
  });
  it('uses recorded scheduled, active, and closed states without payment assumptions', () => {
    for (const status of ['scheduled', 'active', 'closed'] as const) {
      const result = buildBriefing({ ...draft, status });
      expect(result.nodes[3].detail).toBe(`Job marked ${status}`);
      expect(result.nodes.filter((node) => node.current)).toHaveLength(1);
    }
    expect(buildBriefing({ ...draft, status: 'closed' }).attention).toContain('does not confirm payment or inspection');
  });
  it('does not mutate the source data', () => {
    const source = { ...draft, assignments: ['steve', 'steve'] as Array<'steve'> };
    const before = JSON.stringify(source);
    buildBriefing(source);
    expect(JSON.stringify(source)).toBe(before);
  });
});
