import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const rl = await rateLimit(request, RATE_LIMITS.AUTH_STRICT);
    if (rl) return rl;

    let body: { email?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });

    if (!admin) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[ADMIN_LOGIN] JWT_SECRET missing from env');
      return NextResponse.json({ error: 'Server misconfiguration — contact support' }, { status: 500 });
    }

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { id: admin.id, jti },
      jwtSecret,
      { expiresIn: '8h' }
    );

    const isSecure = request.url.startsWith('https://') || process.env.NODE_ENV === 'production';
    const cookieHeader = [
      `aarah_admin_token=${token}`,
      'HttpOnly',
      isSecure ? 'Secure' : '',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${8 * 60 * 60}`,
    ].filter(Boolean).join('; ');

    const response = NextResponse.json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
    }, { status: 200 });

    response.headers.set('Set-Cookie', cookieHeader);
    return response;

  } catch (error: any) {
    console.error('[ADMIN_LOGIN_ERROR]', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
    });
    return NextResponse.json(
      { error: 'Internal server error during authentication', detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}
