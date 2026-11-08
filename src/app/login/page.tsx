import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/jobs');
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-display font-black uppercase tracking-tight text-2xl text-white">
            Elite Edge <span className="text-gold">Ops</span>
          </h1>
          <p className="text-ink-400 text-sm mt-1">Staff sign-in</p>
        </div>
        <div className="card p-6">
          <LoginForm />
        </div>
        <p className="text-center text-xs text-ink-500 mt-4">
          Customers requesting work: <a className="text-gold" href="/request">estimate request form</a>
        </p>
      </div>
    </main>
  );
}
