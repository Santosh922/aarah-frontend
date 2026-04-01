/**
 * Rate limiter using Upstash Redis.
 * Works correctly in serverless/multi-instance deployments.
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env
 * (Free tier: https://upstash.com)
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token || url.includes('your_') || token.includes('your_')) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('[RATE_LIMIT] WARNING: Upstash Redis not configured. Rate limiting is DISABLED. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production env.');
      }
      return null;
    }
    if (!redis) {
      redis = new Redis({ url, token });
    }
    return redis;
  } catch {
    return null;
  }
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ success: true; remaining: number } | { success: false; retryAfter: number }> {
  const key = `ratelimit:${identifier}`;
  const windowSec = Math.ceil(config.windowMs / 1000);

  try {
    const client = getRedis();
    if (!client) return { success: true, remaining: config.limit };

    const current = await client.incr(key);

    if (current === 1) {
      await client.expire(key, windowSec);
    }

    if (current > config.limit) {
      const ttl = await client.ttl(key);
      return { success: false, retryAfter: ttl > 0 ? ttl : windowSec };
    }

    return { success: true, remaining: Math.max(0, config.limit - current) };
  } catch (error) {
    console.error('[RATE_LIMIT_ERROR]', error);
    return { success: true, remaining: config.limit };
  }
}

export const RATE_LIMITS = {
  AUTH_STRICT: { limit: 5, windowMs: 60_000 } as RateLimitConfig,
  AUTH_RELAXED: { limit: 3, windowMs: 60_000 } as RateLimitConfig,
  PAYMENT: { limit: 10, windowMs: 60_000 } as RateLimitConfig,
  CONTACT: { limit: 5, windowMs: 60_000 } as RateLimitConfig,
} as const;

export function getClientIdentifier(request: Request | Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

export async function rateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<Response | null> {
  const key = getClientIdentifier(request);
  const result = await checkRateLimit(key, config);

  if (!result.success) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter),
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': '0',
      },
    });
  }
  return null;
}
