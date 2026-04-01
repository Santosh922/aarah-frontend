import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const discount = await prisma.discount.findUnique({ where: { id } });
    if (!discount) return NextResponse.json({ error: 'Discount not found' }, { status: 404 });

    return NextResponse.json(discount, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch discount' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (body.code) {
      body.code = body.code.trim().toUpperCase();
      const existing = await prisma.discount.findUnique({ where: { code: body.code } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Discount code already exists' }, { status: 409 });
      }
    }

    const updateData: Record<string, any> = { ...body };
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;

    const updated = await prisma.discount.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update discount' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.discount.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete discount' }, { status: 500 });
  }
}
