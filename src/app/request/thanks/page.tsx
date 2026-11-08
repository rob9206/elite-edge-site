import Link from 'next/link';
import { Brand } from '@/components/Brand';

export default function ThanksPage() {
  return (
    <>
      <header className="border-b border-stone-200">
        <div className="public-brand"><Brand ops={false} /></div>
      </header>
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-800" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
        </span>
        <h1 className="text-3xl font-semibold">Request received</h1>
        <p className="mt-3 leading-relaxed text-stone-600">
          We’ll reach out within one business day to confirm details and schedule a visit.
        </p>
        <Link href="/request" className="btn-secondary mt-6">Submit another request</Link>
      </main>
    </>
  );
}
