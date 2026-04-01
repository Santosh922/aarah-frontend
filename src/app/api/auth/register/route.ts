import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS.AUTH_STRICT);
  if (rl) return rl;

  try {
    const { firstName, lastName, email, password } = await request.json();

    if (!email || !password || !firstName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingCustomer) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = lastName ? `${firstName} ${lastName}`.trim() : firstName;

    const newCustomer = await prisma.customer.create({
      data: {
        name: fullName,
        email: email.toLowerCase().trim(),
        passwordHash: hashedPassword,
      }
    });

    const token = jwt.sign(
      { id: newCustomer.id },
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
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({
      user: {
        id: newCustomer.id,
        customerId: newCustomer.id,
        name: newCustomer.name,
        email: newCustomer.email,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[REGISTER_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
