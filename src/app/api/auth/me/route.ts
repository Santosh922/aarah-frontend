import { NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const auth = await getCurrentCustomer(request);
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    return NextResponse.json({
      id: auth.customer.id,
      customerId: auth.customer.customerId,
      name: auth.customer.name,
      email: auth.customer.email,
      phone: auth.customer.phone,
    });
  } catch (error) {
    console.error('[ME_ERROR]', error);
    return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 });
  }
}
