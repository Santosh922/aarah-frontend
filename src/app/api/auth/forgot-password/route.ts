import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendPasswordResetEmail } from '@/lib/mail';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS.AUTH_RELAXED);
  if (rl) return rl;

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!customer || !customer.passwordHash) {
      return NextResponse.json(
        { message: 'If an account with that email exists, a reset link has been sent.' },
        { status: 200 }
      );
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: expiry,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_API_URL}/reset-password?token=${rawToken}`;

    try {
      if (customer.email) {
        await sendPasswordResetEmail(customer.email, resetUrl);
      }
    } catch (mailError) {
      console.error('[EMAIL_DISPATCH_ERROR] Failed to send password reset email:', mailError);
    }

    return NextResponse.json(
      { message: 'If an account with that email exists, a reset link has been sent.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('[FORGOT_PASSWORD_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
