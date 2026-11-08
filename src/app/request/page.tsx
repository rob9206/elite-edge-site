import Link from 'next/link';
import IntakeForm from './IntakeForm';
import { Brand } from '@/components/Brand';

export const metadata = { title: 'Request an estimate — Apex Power' };

export default function RequestPage() {
  return (
    <>
      <header className="border-b border-stone-200">
        <div className="public-brand">
          <Brand ops={false} />
          <Link href="/login" className="btn-secondary">Staff sign-in</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[42rem] px-5 pb-16 pt-9 sm:px-8 sm:pt-12">
        <h1 className="text-3xl font-semibold sm:text-4xl">Request an estimate</h1>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-stone-600">
          Tell us what you have in mind. We reply within one business day with a free, itemized estimate.
        </p>
        <div className="mt-8">
          <IntakeForm />
        </div>
      </main>
    </>
  );
}
