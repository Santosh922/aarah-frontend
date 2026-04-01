import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('aarah_admin_token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
  } catch {
    return null;
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { productIds, action, status } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'No products selected' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'No action specified' }, { status: 400 });
    }

    if (action === 'DELETE') {
      await prisma.product.deleteMany({
        where: { id: { in: productIds } }
      });
      return NextResponse.json({ success: true, message: `Deleted ${productIds.length} products.` });
    }

    if (action === 'UPDATE_STATUS') {
      if (!status) {
        return NextResponse.json({ error: 'Status is required' }, { status: 400 });
      }

      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { status }
      });
      return NextResponse.json({ success: true, message: `Updated ${productIds.length} products to ${status}.` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('[BULK_ACTION_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Failed to process bulk action.' }, { status: 500 });
  }
}
