import { Brand } from '@/components/Brand';

export default function ThanksPage() {
  return (
    <main className="min-h-screen grid place-items-center px-6 text-center">
      <div className="max-w-md">
        <div className="hazard mb-8 rounded" />
        <div className="flex justify-center mb-6"><Brand ops={false} /></div>
        <h1 className="font-display font-black uppercase text-3xl text-white">Request received</h1>
        <p className="text-ink-300 mt-3">
          Thanks — we’ll reach out within one business day to confirm details and schedule a visit.
        </p>
        <a href="/request" className="btn-secondary mt-6">Submit another request</a>
      </div>
    </main>
  );
}
