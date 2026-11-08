import Link from 'next/link';
import type { JobStatus, TaskStatus, PaymentStatus } from '@prisma/client';
import { logoutAction } from '@/lib/auth/actions';
import type { SessionData } from '@/lib/auth/options';

const JOB_COLORS: Record<JobStatus, string> = {
  draft: 'bg-ink-700 text-ink-200',
  estimated: 'bg-edge-blue/20 text-edge-blue',
  approved: 'bg-gold/20 text-gold',
  scheduled: 'bg-edge-green/20 text-edge-green',
  active: 'bg-edge-green/30 text-edge-green',
  closed: 'bg-ink-700 text-ink-400',
};

const TASK_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-ink-700 text-ink-300',
  active: 'bg-gold/20 text-gold',
  blocked: 'bg-edge-orange/20 text-edge-orange',
  done: 'bg-edge-green/20 text-edge-green',
};

const PAY_COLORS: Record<PaymentStatus, string> = {
  pending: 'bg-edge-orange/20 text-edge-orange',
  confirmed: 'bg-edge-blue/20 text-edge-blue',
  complete: 'bg-edge-green/20 text-edge-green',
  incomplete: 'bg-edge-red/20 text-edge-red',
};

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}

export const JobBadge = ({ status }: { status: JobStatus }) => (
  <Pill className={JOB_COLORS[status]}>{status}</Pill>
);
export const TaskBadge = ({ status }: { status: TaskStatus }) => (
  <Pill className={TASK_COLORS[status]}>{status}</Pill>
);
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => (
  <Pill className={PAY_COLORS[status]}>{status}</Pill>
);

export const AssigneeBadge = ({ who }: { who: 'foti' | 'steve' }) => (
  <Pill className={who === 'foti' ? 'bg-gold/20 text-gold' : 'bg-edge-blue/20 text-edge-blue'}>
    {who}
  </Pill>
);

export function TopBar({ user }: { user: SessionData }) {
  return (
    <header className="border-b border-ink-700 bg-ink-850/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl flex items-center gap-4 px-6 h-14">
        <Link href="/jobs" className="font-display font-black uppercase tracking-tight text-white">
          Elite Edge <span className="text-gold">Ops</span>
        </Link>
        <nav className="flex gap-1 text-sm ml-4">
          <Link href="/jobs" className="px-3 py-1.5 rounded hover:text-gold hover:bg-gold/10">Jobs</Link>
          {user.role === 'admin' && (
            <Link href="/request" className="px-3 py-1.5 rounded hover:text-gold hover:bg-gold/10">Intake form</Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-ink-400">
            {user.name} · <span className="uppercase text-xs tracking-wide">{user.role === 'admin' ? 'admin' : 'read-only'}</span>
          </span>
          <form action={logoutAction}>
            <button className="btn-ghost text-xs py-1">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
