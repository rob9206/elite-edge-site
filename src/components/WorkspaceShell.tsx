import Link from 'next/link';
import type { ReactNode } from 'react';
import { logoutAction } from '@/lib/auth/actions';
import type { SessionData } from '@/lib/auth/options';
import { Brand } from './Brand';
import styles from './WorkspaceShell.module.css';

type Props = {
  user: SessionData;
  children: ReactNode;
  jobName?: string;
  hasPlan?: boolean;
};

function WorkspaceLinks({ user, isIndex }: { user: SessionData; isIndex: boolean }) {
  return (
    <nav aria-label="Workspace" className={styles.links}>
      <Link href="/jobs" className={styles.selected} aria-current={isIndex ? 'page' : undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3.5 7.5V6a2 2 0 0 1 2-2h4l2.2 2.5h6.8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10Z" />
        </svg>
        Jobs
      </Link>
      {user.role === 'admin' && (
        <Link href="/request">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6M10 14l.7-3.2 7.2-7.2a1.7 1.7 0 0 1 2.4 2.4L13 13.2 10 14Z" />
          </svg>
          Intake form
        </Link>
      )}
    </nav>
  );
}

function Account({ user }: { user: SessionData }) {
  return (
    <div className={styles.account}>
      <div className={styles.identity}>
        <span className={styles.avatar} aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
        <div><strong>{user.name}</strong><small>{user.role === 'admin' ? 'Administrator' : 'Crew member'}</small></div>
      </div>
      <form action={logoutAction}><button className={styles.signout}>Sign out</button></form>
    </div>
  );
}

export function WorkspaceShell({ user, children, jobName, hasPlan }: Props) {
  const navigation = (
    <>
      <WorkspaceLinks user={user} isIndex={!jobName} />
      {jobName && (
        <nav aria-label="Sections in this job" className={styles.sections}>
          <span>This job</span>
          <a href="#request">Request</a>
          <a href="#estimate">Estimate</a>
          {hasPlan && <a href="#plan">Plan of action</a>}
          <a href="#payments">Payments</a>
          <a href="#ledger">Ledger</a>
        </nav>
      )}
    </>
  );
  return (
    <div className={styles.shell}>
      <aside className={styles.rail}>
        <Link href="/jobs" className={styles.brand} aria-label="Apex Power Ops jobs"><Brand /></Link>
        {navigation}
        <Account user={user} />
      </aside>
      <div className={styles.canvas}>
        <details className={styles.mobileMenu}>
          <summary>
            <Brand />
            <span>Menu
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" /></svg>
            </span>
          </summary>
          {navigation}
          <Account user={user} />
        </details>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <span>Workspace</span><i aria-hidden="true">/</i>
          {jobName ? <><Link href="/jobs">Jobs</Link><i aria-hidden="true">/</i><b aria-current="page">{jobName}</b></> : <b aria-current="page">Jobs</b>}
        </nav>
        {children}
      </div>
    </div>
  );
}
