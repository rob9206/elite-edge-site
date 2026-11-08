import type { SessionOptions } from 'iron-session';
import type { Role } from '@prisma/client';

export interface SessionData {
  userId: string;
  username: string;
  name: string;
  role: Role;
}

export const sessionOptions: SessionOptions = {
  // SESSION_SECRET must be ≥ 32 chars. Validated at startup in env.ts.
  password: process.env.SESSION_SECRET ?? 'dev-session-secret-not-for-production-min-32',
  cookieName: 'ee_ops_session',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8h shift
  },
};
