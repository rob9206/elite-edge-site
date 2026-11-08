import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from './options';

/** Read the current session (may be empty). Server-only. */
export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

/** The logged-in user, or null. */
export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();
  return session.userId ? { ...session } : null;
}

/** Require any authenticated staff user; redirect to /login otherwise. */
export async function requireUser(): Promise<SessionData> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Require the admin (Foti); redirect read-only users to the dashboard. */
export async function requireAdmin(): Promise<SessionData> {
  const user = await requireUser();
  if (user.role !== 'admin') redirect('/jobs?error=admin_only');
  return user;
}

/** Non-redirecting guard for server actions / route handlers. */
export async function assertAdmin(): Promise<SessionData> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated.');
  if (user.role !== 'admin') throw new Error('Only Foti (admin) can perform this action.');
  return user;
}
