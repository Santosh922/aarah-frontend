import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const customers = await prisma.customer.findMany({
      where: { passwordResetToken: hashedToken }
    });
    const customer = customers[0] ?? null;

    if (!customer) {
      return NextResponse.json({ error: 'Invalid or expired password reset link. Please request a new one.' }, { status: 400 });
    }

    if (!customer.passwordResetExpiry || new Date() > new Date(customer.passwordResetExpiry)) {
      return NextResponse.json({ error: 'This password reset link has expired. Please request a new one.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      }
    });

    return NextResponse.json({ success: true, message: 'Password reset successfully' }, { status: 200 });

  } catch (error) {
    console.error('[RESET_PASSWORD_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error during password reset.' }, { status: 500 });
  }
}
