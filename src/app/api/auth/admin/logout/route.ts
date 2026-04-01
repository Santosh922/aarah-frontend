import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { revokeToken } from '@/lib/server-auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('aarah_admin_token')?.value;

    if (token) {
      await revokeToken(token);
    }

    cookieStore.set({
      name: 'aarah_admin_token',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('[ADMIN_LOGOUT_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error during logout' },
      { status: 500 }
    );
  }
}
