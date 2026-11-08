import type { JobStatus, TaskStatus, PaymentStatus } from '@prisma/client';

const JOB_COLORS: Record<JobStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-700',
  estimated: 'bg-sky-50 text-sky-800',
  approved: 'bg-amber-50 text-amber-800',
  scheduled: 'bg-emerald-50 text-emerald-800',
  active: 'bg-emerald-100 text-emerald-900',
  closed: 'bg-stone-100 text-stone-700',
};

const TASK_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-neutral-100 text-neutral-700',
  active: 'bg-amber-50 text-amber-800',
  blocked: 'bg-orange-50 text-orange-800',
  done: 'bg-emerald-50 text-emerald-800',
};

const PAY_COLORS: Record<PaymentStatus, string> = {
  pending: 'bg-orange-50 text-orange-800',
  confirmed: 'bg-sky-50 text-sky-800',
  complete: 'bg-emerald-50 text-emerald-800',
  incomplete: 'bg-red-50 text-red-800',
};

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${className}`}>
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
  <Pill className={who === 'foti' ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-800'}>
    {who}
  </Pill>
);
