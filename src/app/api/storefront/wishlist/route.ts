import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentCustomer } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const auth = await getCurrentCustomer(request);
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: auth.customer.id },
      select: {
        wishlist: {
          select: { id: true }
        }
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const wishlistIds = customer.wishlist.map(p => p.id);

    return NextResponse.json({ wishlist: wishlistIds });
  } catch (error) {
    console.error('[WISHLIST_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getCurrentCustomer(request);
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ error: auth.error || 'Please log in to use wishlist' }, { status: 401 });
    }

    const { productId, action } = await request.json();

    if (!productId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'add') {
      await prisma.customer.update({
        where: { id: auth.customer.id },
        data: {
          wishlist: { connect: { id: productId } }
        }
      });
      return NextResponse.json({ success: true, action: 'added' });
    } else if (action === 'remove') {
      await prisma.customer.update({
        where: { id: auth.customer.id },
        data: {
          wishlist: { disconnect: { id: productId } }
        }
      });
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[WISHLIST_API_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
