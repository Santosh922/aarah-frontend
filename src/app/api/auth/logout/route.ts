import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('aarah_customer_token');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LOGOUT_ERROR]', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
