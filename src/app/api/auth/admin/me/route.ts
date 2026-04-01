import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('aarah_admin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET environment variable is missing.');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as { id: string };
    } catch (err) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
      }
    });

    if (!admin) {
      return NextResponse.json({ error: 'User no longer exists' }, { status: 401 });
    }

    return NextResponse.json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
    }, { status: 200 });

  } catch (error) {
    console.error('[ADMIN_ME_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
