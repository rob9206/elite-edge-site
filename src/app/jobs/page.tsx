import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { JobBadge } from '@/components/ui';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { formatUsd } from '@/lib/money';
import { JOB_TYPES } from '@/lib/estimate/catalog';
import styles from './jobs.module.css';

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
    <WorkspaceShell user={user}>
      <main className={styles.page}>
        {searchParams.error === 'admin_only' && (
          <p role="alert" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            That action is restricted to Foti (admin).
          </p>
        )}
        <header className={styles.header}>
          <div>
            <h1>Jobs</h1>
            <p>{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</p>
          </div>
          <Link href="/request" className="btn-primary"><span aria-hidden="true">+</span> New intake</Link>
        </header>
        <div className={styles.tableFrame}>
          <table className={styles.table}>
            <caption className="sr-only">Jobs in order of creation, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col" className={styles.desktopColumn}>Service</th>
                <th scope="col">Status</th>
                <th scope="col" className={styles.number}>Latest total</th>
                <th scope="col" className={`${styles.desktopColumn} ${styles.number}`}>Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>No jobs yet. Use New intake to create the first one.</td></tr>
              )}
              {jobs.map((job) => {
                const estimate = job.estimates[0];
                const service = JOB_TYPES[job.jobType]?.label ?? job.jobType;
                const created = job.createdAt.toISOString().slice(0, 10);
                return (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/jobs/${job.id}`} className={styles.customer}>{job.customerName}</Link>
                      <span className={styles.address}>{job.address}</span>
                      <span className={styles.mobileDetail}>{service}</span>
                    </td>
                    <td className={styles.desktopColumn}>{service}</td>
                    <td><JobBadge status={job.status} /></td>
                    <td className={styles.number}>
                      {estimate ? formatUsd(estimate.totalCents) : '—'}
                      <time className={styles.mobileDetail} dateTime={created}>{created}</time>
                    </td>
                    <td className={`${styles.desktopColumn} ${styles.number}`}>
                      <time dateTime={created}>{created}</time>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </WorkspaceShell>
  );
}
