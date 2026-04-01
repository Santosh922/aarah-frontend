import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

function getRedis(): Redis | null {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token || url.includes('your_') || token.includes('your_')) {
      return null;
    }
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get('pin');

  if (!pin || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'Invalid pincode' }, { status: 400 });
  }

  const redis = getRedis();
  const cacheKey = `pincode:${pin}`;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } });
    } catch {
      // cache miss — continue to API
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: 'Pincode service unavailable' }, { status: 502 });
    }

    const data = await res.json();
    const result = data?.[0] ?? {};

    if (redis) {
      try {
        await redis.set(cacheKey, result, { ex: 7 * 24 * 60 * 60 }); // 7-day TTL
      } catch {
        // cache write failed — non-fatal
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return NextResponse.json({ error: 'Pincode service timed out — please try again' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Failed to check pincode' }, { status: 502 });
  }
}
