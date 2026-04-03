import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'All';
    const search = searchParams.get('search');

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '15', 10));

    const whereClause: Prisma.OrderWhereInput = {};

    if (status !== 'All') {
      whereClause.status = status as any;
    }

    if (search) {
      whereClause.OR = [
        { orderId: { contains: search, mode: 'insensitive' } },
        { shippingName: { contains: search, mode: 'insensitive' } },
        { shippingPhone: { contains: search } }
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where: whereClause }),
      prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: true }
      })
    ]);

    const formattedOrders = orders.map(o => ({
      id: o.orderId,
      invoiceId: `INV-${o.orderId.split('-')[1]}`,
      customer: { name: o.shippingName, email: o.shippingEmail, phone: o.shippingPhone },
      address: { line1: o.shippingLine1, city: o.shippingCity, state: o.shippingState, pincode: o.shippingPostal },
      items: o.items.map(i => ({ name: i.name, sku: i.sku, qty: i.quantity, price: i.price, size: i.size })),
      subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, total: o.total,
      paymentMode: o.paymentMode, paymentId: o.paymentId, status: o.status,
      courierName: o.courierName, trackingId: o.trackingId,
      createdAt: o.createdAt.toISOString()
    }));

    return NextResponse.json({ orders: formattedOrders, total }, { status: 200 });

  } catch (error) {
    console.error('[ORDERS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
