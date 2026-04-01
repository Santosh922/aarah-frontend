import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS.AUTH_STRICT);
  if (rl) return rl;

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!customer || !customer.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, customer.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

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
      user: {
        id: customer.id,
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[LOGIN_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
