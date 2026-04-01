import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentCustomer } from '@/lib/server-auth';

interface CartItemInput {
  id: string;
  variantId?: string;
  quantity: number;
}

export async function POST(request: Request) {
  try {
    const auth = await getCurrentCustomer(request);
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { items }: { items?: CartItemInput[] } = await request.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Invalid items' }, { status: 400 });
    }

    const itemIds = items.map(i => i.id);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: itemIds }, status: 'Active' },
      select: { id: true }
    });
    const validIds = new Set(dbProducts.map(p => p.id));

    const validItems = items.filter(i => validIds.has(i.id));

    const existing = await prisma.cart.findFirst({
      where: { customerId: auth.customer.id },
    });

    if (existing) {
      await prisma.cartItem.deleteMany({ where: { cartId: existing.id } });
      if (validItems.length > 0) {
        await prisma.cartItem.createMany({
          data: validItems.map(item => ({
            cartId: existing.id,
            productId: item.id,
            variantId: item.variantId || null,
            quantity: item.quantity,
          })),
        });
      }
    } else if (validItems.length > 0) {
      const cart = await prisma.cart.create({
        data: { customerId: auth.customer.id },
      });
      await prisma.cartItem.createMany({
        data: validItems.map(item => ({
          cartId: cart.id,
          productId: item.id,
          variantId: item.variantId || null,
          quantity: item.quantity,
        })),
      });
    }

    return NextResponse.json({ success: true, itemCount: validItems.length });
  } catch (error) {
    console.error('[CART_SYNC_ERROR]', error);
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await getCurrentCustomer(request);
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const cart = await prisma.cart.findFirst({
      where: { customerId: auth.customer.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, price: true, mrp: true, status: true } },
            variant: { select: { id: true, size: true, stock: true } }
          }
        }
      }
    });

    return NextResponse.json({ success: true, items: cart?.items || [] });
  } catch (error) {
    console.error('[CART_GET_ERROR]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch cart' }, { status: 500 });
  }
}
