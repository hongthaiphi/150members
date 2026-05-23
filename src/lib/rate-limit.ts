/**
 * Simple in-memory rate limiter.
 * Works per server instance (suitable for Vercel serverless — each instance limits independently).
 * For production multi-instance setups, replace with Redis/Upstash.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodically clean up expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key)
  })
}, 60_000)

export interface RateLimitOptions {
  /** Max requests per window. Default: 10 */
  limit?: number
  /** Window duration in ms. Default: 60_000 (1 minute) */
  windowMs?: number
}

export interface RateLimitResult {
  success: boolean
  /** Requests remaining in current window */
  remaining: number
  /** Epoch ms when the window resets */
  resetAt: number
}

/**
 * Check rate limit for a given key (e.g. user ID or IP address).
 * Returns { success: false } if the limit is exceeded.
 */
export function checkRateLimit(
  key: string,
  { limit = 10, windowMs = 60_000 }: RateLimitOptions = {}
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: limit - 1, resetAt }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}
