'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction } from '@/lib/auth/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useFormState(loginAction, { error: '' as string });
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="username">Username</label>
        <input id="username" name="username" className="input" autoComplete="username" autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" />
      </div>
      {state?.error ? <p className="text-sm text-edge-red">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
