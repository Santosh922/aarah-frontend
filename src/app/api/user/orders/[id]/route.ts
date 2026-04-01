import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentCustomer } from '@/lib/server-auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentCustomer();
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { reason } = await request.json();

    const order = await prisma.order.findFirst({
      where: {
        id,
        customerId: auth.customer.id
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 });
    }

    await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED'
      }
    });

    return NextResponse.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('[CANCEL_ORDER_ERROR]', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
