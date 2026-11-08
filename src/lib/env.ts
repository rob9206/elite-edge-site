import { z } from 'zod';

/**
 * Validates server environment at import time. Keep this server-only — it reads
 * secrets. Non-secret defaults are allowed in development.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  DATABASE_URL: z.string().url(),
  UNIWIRE_MODE: z.enum(['stub', 'live']).default('stub'),
  UNIWIRE_API_BASE: z.string().url().default('https://api.uniwire.com'),
  UNIWIRE_API_KEY: z.string().optional(),
  UNIWIRE_API_SECRET: z.string().optional(),
  UNIWIRE_PROFILE_ID: z.string().optional(),
  UNIWIRE_WEBHOOK_SECRET: z.string().min(1).default('dev-webhook-secret'),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid server environment: ${issues}`);
  }
  if (parsed.data.UNIWIRE_MODE === 'live') {
    const { UNIWIRE_API_KEY, UNIWIRE_API_SECRET, UNIWIRE_PROFILE_ID } = parsed.data;
    if (!UNIWIRE_API_KEY || !UNIWIRE_API_SECRET || !UNIWIRE_PROFILE_ID) {
      throw new Error('UNIWIRE_MODE=live requires API key, secret, and profile id.');
    }
  }
  cached = parsed.data;
  return cached;
}
