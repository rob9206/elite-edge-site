import { headers } from 'next/headers';

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(): string {
  const h = headers();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return h.get('x-real-ip') ?? 'unknown';
}
