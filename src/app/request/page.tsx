import IntakeForm from './IntakeForm';

export const metadata = { title: 'Request an Estimate — Elite Edge Construction' };

export default function RequestPage() {
  return (
    <main className="min-h-screen">
      <div className="hazard" />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold mb-2">
            Free, no-obligation
          </div>
          <h1 className="font-display font-black uppercase text-3xl text-white">
            Request an estimate
          </h1>
          <p className="text-ink-400 mt-2">
            Tell us about the job. We reply within one business day with a clear, itemized quote.
          </p>
        </div>
        <div className="card p-6">
          <IntakeForm />
        </div>
      </div>
    </main>
  );
}
