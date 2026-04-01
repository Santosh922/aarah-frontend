import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/mail';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { orderId: id },
      include: { items: true }
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const emailSent = await sendInvoiceEmail({
      customer: { email: order.shippingEmail, name: order.shippingName },
      items: order.items,
      total: order.total,
      orderId: order.orderId
    });

    if (emailSent.success) {
      return NextResponse.json({ message: 'Receipt sent successfully' });
    } else {
      throw new Error('Email provider failed');
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
