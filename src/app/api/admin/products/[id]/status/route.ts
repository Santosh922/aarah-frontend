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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, name: true }
    });

    return NextResponse.json(updatedProduct);

  } catch (error: any) {
    console.error('[STATUS_UPDATE_ERROR]', error);

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ error: error.message || 'Failed to update status.' }, { status: 500 });
  }
}
