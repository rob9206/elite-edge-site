/**
 * Minimal in-memory token-bucket rate limiter.
 *
 * Good enough for a single-instance internal tool and the public form/webhook.
 * NOTE: in a multi-instance / serverless deployment this is per-instance only —
 * swap in a shared store (e.g. Upstash Redis) for strict global limits. The
 * call sites don't change.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Returns true if the action is allowed, false if the limit is exceeded. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

/** Periodic cleanup so the map doesn't grow unbounded. */
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }, 60_000);
  // Don't keep the process alive just for cleanup.
  if (typeof timer === 'object' && 'unref' in timer) timer.unref();
}
