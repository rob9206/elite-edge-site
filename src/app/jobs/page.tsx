import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { TopBar, JobBadge } from '@/components/ui';
import { formatUsd } from '@/lib/money';
import { JOB_TYPES } from '@/lib/estimate/catalog';

export const dynamic = 'force-dynamic';

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await requireUser();
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      estimates: { orderBy: { revision: 'desc' }, take: 1 },
    },
  });

  return (
    <>
      <TopBar user={user} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        {searchParams.error === 'admin_only' && (
          <div className="mb-4 rounded-md border border-edge-orange/40 bg-edge-orange/10 px-4 py-2 text-sm text-edge-orange">
            That action is restricted to Foti (admin).
          </div>
        )}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-display font-black uppercase text-2xl text-white">Jobs</h1>
            <p className="text-ink-400 text-sm">Intake → estimate → plan → ledger</p>
          </div>
          <Link href="/request" className="btn-secondary">New intake</Link>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-850 text-ink-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Customer</th>
                <th className="text-left font-semibold px-4 py-3">Service</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-right font-semibold px-4 py-3">Latest total</th>
                <th className="text-right font-semibold px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">No jobs yet.</td></tr>
              )}
              {jobs.map((job) => {
                const est = job.estimates[0];
                return (
                  <tr key={job.id} className="border-t border-ink-700 hover:bg-ink-850/60">
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${job.id}`} className="text-white hover:text-gold font-medium">
                        {job.customerName}
                      </Link>
                      <div className="text-ink-500 text-xs">{job.address}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-300">
                      {JOB_TYPES[job.jobType]?.label ?? job.jobType}
                    </td>
                    <td className="px-4 py-3"><JobBadge status={job.status} /></td>
                    <td className="px-4 py-3 text-right mono text-ink-200">
                      {est ? formatUsd(est.totalCents) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-500 text-xs">
                      {job.createdAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
