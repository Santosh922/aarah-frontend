import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Redis } from '@upstash/redis';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ''));
}

function isValidOTP(otp: string): boolean {
  return /^\d{4}$/.test(otp);
}

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS.AUTH_STRICT);
  if (rl) return rl;

  try {
    const { phone, otp } = await request.json();

    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 });
    }

    if (!otp || !isValidOTP(otp)) {
      return NextResponse.json({ error: 'Valid 4-digit OTP required' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\s+/g, '').replace(/^\+91/, '');
    const key = `otp:${cleanPhone}`;

    const stored = await getRedis().get<string>(key);
    if (!stored) {
      return NextResponse.json({ error: 'OTP expired or not requested. Please request a new OTP.' }, { status: 400 });
    }

    const parsed = JSON.parse(stored);
    if (parsed.otp !== otp) {
      const attempts = (parsed.attempts || 0) + 1;
      if (attempts >= 3) {
        await getRedis().del(key);
        return NextResponse.json({ error: 'Too many attempts. Please request a new OTP.' }, { status: 429 });
      }
      await getRedis().set(key, JSON.stringify({ ...parsed, attempts }), { ex: 300 });
      return NextResponse.json({ error: `Incorrect OTP. ${3 - attempts} attempt(s) remaining.` }, { status: 400 });
    }

    await getRedis().del(key);

    const customer = await prisma.customer.upsert({
      where: { phone: cleanPhone },
      create: {
        phone: cleanPhone,
        customerId: `CUST_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      },
      update: {},
      select: { id: true, customerId: true, name: true, email: true, phone: true },
    });

    const token = jwt.sign(
      { id: customer.id },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    const cookieStore = await cookies();
    cookieStore.set({
      name: 'aarah_customer_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: customer.id,
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      }
    });
  } catch (error) {
    console.error('[VERIFY_OTP_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
