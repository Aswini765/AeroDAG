/**
 * AeroDAG Provider-Neutral Rate Limiter & Abuse Protection
 * 
 * Protects against denial-of-service, brute force, and runaway LLM cost by enforcing
 * sliding-window rate limits across chat turns, booking operations, and authentication attempts.
 */

export interface RateLimitStatus {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSec?: number;
}

export interface RateLimitPolicy {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private static instance: RateLimiter | null = null;
  // Key: `${action}:${identifier}` -> Array of request timestamps in ms
  private requestHistory: Map<string, number[]> = new Map();

  private static readonly DEFAULT_POLICIES: Record<string, RateLimitPolicy> = {
    chat: { maxRequests: 30, windowMs: 60 * 1000 },       // 30 chat requests/min
    trip_gen: { maxRequests: 10, windowMs: 60 * 1000 },   // 10 trip plans/min
    booking: { maxRequests: 5, windowMs: 60 * 1000 },     // 5 booking actions/min
    auth: { maxRequests: 5, windowMs: 60 * 1000 },        // 5 auth attempts/min
    tool: { maxRequests: 60, windowMs: 60 * 1000 }        // 60 tool calls/min
  };

  private constructor() {}

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Evaluates and consumes a rate limit token for an action and identifier.
   */
  consume(
    action: string,
    identifier: string,
    customPolicy?: RateLimitPolicy
  ): RateLimitStatus {
    const policy = customPolicy || RateLimiter.DEFAULT_POLICIES[action] || { maxRequests: 30, windowMs: 60 * 1000 };
    const key = `${action}:${identifier}`;
    const now = Date.now();
    const windowStart = now - policy.windowMs;

    const timestamps = this.requestHistory.get(key) || [];
    // Filter out timestamps outside current sliding window
    const activeTimestamps = timestamps.filter((t) => t > windowStart);

    if (activeTimestamps.length >= policy.maxRequests) {
      const oldest = activeTimestamps[0];
      const resetMs = Math.max(0, oldest + policy.windowMs - now);
      const retryAfterSec = Math.ceil(resetMs / 1000);

      this.requestHistory.set(key, activeTimestamps);
      return {
        allowed: false,
        limit: policy.maxRequests,
        remaining: 0,
        resetMs,
        retryAfterSec
      };
    }

    activeTimestamps.push(now);
    this.requestHistory.set(key, activeTimestamps);

    return {
      allowed: true,
      limit: policy.maxRequests,
      remaining: policy.maxRequests - activeTimestamps.length,
      resetMs: policy.windowMs
    };
  }

  /**
   * Resets all history (for unit testing)
   */
  clear(): void {
    this.requestHistory.clear();
  }
}

export function getRateLimiter(): RateLimiter {
  return RateLimiter.getInstance();
}
