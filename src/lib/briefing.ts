export type BriefingStatus = 'draft' | 'estimated' | 'approved' | 'scheduled' | 'active' | 'closed';

export type BriefingSource = {
  description: string;
  status: BriefingStatus;
  estimateRevision: number | null;
  approvedRevision: number | null;
  planSequence: number | null;
  assignments: Array<'foti' | 'steve'>;
  blockedCount: number;
};

const statusLabels: Record<BriefingStatus, string> = {
  draft: 'Draft', estimated: 'Estimated', approved: 'Approved',
  scheduled: 'Scheduled', active: 'Active', closed: 'Closed',
};

/** Read-only overview. Missing evidence never becomes a completion claim. */
export function buildBriefing(source: BriefingSource) {
  const scope = source.description.trim() || 'No scope description recorded.';
  const names = { foti: 'Foti', steve: 'Steve' };
  const crew = [...new Set(source.assignments)].map((name) => names[name]).join(' + ')
    || 'No crew assignments recorded';
  const notes: string[] = [];
  if (source.estimateRevision === null) notes.push('No estimate has been saved.');
  else if (source.approvedRevision === null) notes.push('Estimate approval is not recorded.');
  else if (source.estimateRevision !== source.approvedRevision) {
    notes.push(`Latest estimate is revision ${source.estimateRevision}; approval is for revision ${source.approvedRevision}.`);
  }
  if (source.blockedCount > 0) {
    notes.push(`${source.blockedCount} blocked ${source.blockedCount === 1 ? 'item is' : 'items are'} recorded in the saved plan.`);
  }
  if (source.approvedRevision !== null && source.planSequence === null) notes.push('No saved plan is available.');
  if (source.status === 'closed') notes.push('Marked closed; this does not confirm payment or inspection.');
  if (notes.length === 0) notes.push('No approval or blocked-plan flags found in these saved records. Site readiness is not verified.');

  const current = source.status === 'draft' ? 'request'
    : source.status === 'estimated' ? 'estimate'
    : source.status === 'approved' ? 'approval' : 'delivery';
  const delivery = ['scheduled', 'active', 'closed'].includes(source.status)
    ? `Job marked ${statusLabels[source.status].toLowerCase()}` : 'Delivery status not recorded';

  return {
    scope,
    statusLabel: statusLabels[source.status],
    crew,
    attention: notes.join(' '),
    nodes: [
      { id: 'request', label: 'Request', detail: 'Request saved', href: '#request' },
      { id: 'estimate', label: 'Estimate', detail: source.estimateRevision === null ? 'Not created' : `Revision ${source.estimateRevision} saved`, href: '#estimate' },
      { id: 'approval', label: 'Approval', detail: source.approvedRevision === null ? 'Not recorded' : `Revision ${source.approvedRevision} approved`, href: '#estimate' },
      { id: 'delivery', label: 'Delivery', detail: delivery, href: '#ledger' },
    ].map((node) => ({ ...node, current: node.id === current })),
  };
}
