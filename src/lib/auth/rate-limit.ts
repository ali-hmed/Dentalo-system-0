// In-memory sliding window rate limiter
// Suitable for single-instance or containerized environments, with memory cleanup.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((entry, key) => {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Checks and increments rate limit counter for a given key (e.g., `login:${ip}`).
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: maxAttempts,
      remaining: maxAttempts - 1,
      resetAt,
    };
  }

  if (entry.count >= maxAttempts) {
    return {
      success: false,
      limit: maxAttempts,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count += 1;
  return {
    success: true,
    limit: maxAttempts,
    remaining: maxAttempts - entry.count,
    resetAt: entry.resetAt,
  };
}

export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
