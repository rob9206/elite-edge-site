import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';
import { Brand } from '@/components/Brand';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/jobs');
  return (
    <main className="grid min-h-[100svh] place-items-center px-6 py-12">
      <div className="w-full max-w-[21rem]">
        <Brand />
        <h1 className="mb-7 mt-10 text-3xl font-semibold">Staff sign-in</h1>
        <LoginForm />
        <p className="mt-8 border-t border-stone-200 pt-5 text-sm text-stone-600">
          Need work done? <Link className="public-link" href="/request">Request an estimate</Link>
        </p>
      </div>
    </main>
  );
}
