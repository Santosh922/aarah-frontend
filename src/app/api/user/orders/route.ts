import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentCustomer } from '@/lib/server-auth';

export async function GET() {
  try {
    const auth = await getCurrentCustomer();
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { customerId: auth.customer.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('[ORDERS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
