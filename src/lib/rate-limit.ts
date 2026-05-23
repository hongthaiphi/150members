import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// M-3: Distributed rate limiter backed by Upstash Redis.
// In-memory Map was ineffective on Vercel serverless (each instance had its own counter).

let uploadRateLimiter: Ratelimit | null = null

function getUploadRateLimiter(): Ratelimit {
  if (!uploadRateLimiter) {
    const redis = Redis.fromEnv()
    uploadRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      prefix: 'rl:upload',
    })
  }
  return uploadRateLimiter
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

export async function checkRateLimit(
  key: string,
  // options kept for API compatibility but Upstash limiter uses fixed config above
  _options?: { limit?: number; windowMs?: number }
): Promise<RateLimitResult> {
  const limiter = getUploadRateLimiter()
  const { success, remaining, reset } = await limiter.limit(key)
  return { success, remaining, resetAt: reset }
}
