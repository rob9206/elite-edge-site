'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword } from './password';
import { getSession } from './session';
import { checkRateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/request';

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

export async function loginAction(_prev: unknown, formData: FormData) {
  const ip = clientIp();
  if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
    return { error: 'Too many attempts. Wait a minute and try again.' };
  }

  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: 'Enter a username and password.' };
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username.toLowerCase().trim() },
  });
  // Always run a compare to avoid leaking which usernames exist (timing).
  const ok = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPassword(parsed.data.password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinv');

  if (!user || !ok) {
    return { error: 'Invalid username or password.' };
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.name = user.name;
  session.role = user.role;
  await session.save();

  redirect('/jobs');
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect('/login');
}
