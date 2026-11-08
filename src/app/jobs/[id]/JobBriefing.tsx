import { buildBriefing, type BriefingSource } from '@/lib/briefing';

export default function JobBriefing({ source }: { source: BriefingSource }) {
  const briefing = buildBriefing(source);
  return (
    <section id="plan" tabIndex={-1} aria-labelledby="briefing-title" className="card min-w-0 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="briefing-title" className="text-lg font-semibold tracking-tight text-neutral-900">Job briefing</h2>
        <span className="text-xs text-neutral-500">From saved job records</span>
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Briefing summary</h3>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-800">{briefing.scope}</p>
      <dl className="mt-4 grid gap-3 border-y border-stone-200 py-3 sm:grid-cols-3">
        <div><dt className="text-xs text-neutral-500">Recorded status</dt><dd className="mt-1 text-sm font-medium text-neutral-900">{briefing.statusLabel}</dd></div>
        <div><dt className="text-xs text-neutral-500">Saved crew assignments</dt><dd className="mt-1 break-words text-sm font-medium text-neutral-900">{briefing.crew}</dd></div>
        <div><dt className="text-xs text-neutral-500">Plan reference</dt><dd className="mt-1 text-sm font-medium text-neutral-900">{source.planSequence === null ? 'Not recorded' : `Plan ${source.planSequence}`}</dd></div>
      </dl>
      <div className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-sm leading-relaxed text-neutral-700">
        <span className="font-semibold text-neutral-900">At a glance: </span>{briefing.attention}
      </div>
      <figure className="mt-5" aria-labelledby="job-flow-title">
        <figcaption id="job-flow-title" className="mb-3 text-sm font-semibold text-neutral-900">Job-flow diagram</figcaption>
        <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-stretch">
          {briefing.nodes.map((node, index) => (
            <div key={node.id} className="flex min-w-0 flex-1 flex-col items-stretch gap-2 lg:flex-row">
              <a href={node.href} className={`min-w-0 flex-1 rounded-lg border px-3 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${node.current ? 'border-neutral-700 bg-stone-100' : 'border-stone-300 bg-white'}`}>
                <span className="block font-semibold text-neutral-900">{node.label}</span>
                <span className="mt-1 block break-words text-xs leading-relaxed text-neutral-600">{node.detail}</span>
                {node.current && <span className="mt-2 block text-xs font-medium text-neutral-800">Current recorded stage</span>}
              </a>
              {index < briefing.nodes.length - 1 && (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 rotate-90 self-center text-neutral-500 lg:rotate-0" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-neutral-500">Arrows show the workflow, not proof of completion. This is an operations overview, not an electrical installation diagram.</p>
      </figure>
      <p className="mt-4 border-t border-stone-200 pt-3 text-xs text-neutral-500">Task controls are hidden for now. Existing plans, assignments, and history are preserved.</p>
    </section>
  );
}
