// Production-ready rate limiting
import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for development (use Redis in production)
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(store.entries())) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => req.ip || 'unknown',
      skipSuccessfulRequests: false,
      ...config,
    };
  }

  async check(req: NextRequest): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const key = this.config.keyGenerator!(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create entry
    let entry = store.get(key);
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter,
      };
    }

    // Increment counter
    entry.count++;
    store.set(key, entry);

    return {
      allowed: true,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }
}

// Pre-configured rate limiters
export const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyGenerator: (req) => {
    const ip = req.ip || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';
    return `auth:${ip}:${userAgent}`;
  },
});

export const apiRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

export const contactRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 contact form submissions per hour
});

export const webhookRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000, // 1000 webhooks per minute
});

export function createRateLimitHeaders(
  remaining: number,
  resetTime: number,
  retryAfter?: number
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
  };

  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString();
  }

  return headers;
}
