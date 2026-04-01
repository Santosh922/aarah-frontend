import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { assigneeId } = await request.json();
    const { id } = await params;

    const updated = await prisma.order.update({
      where: { orderId: id },
      data: {
        assigneeId: assigneeId || null,
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to assign order' }, { status: 500 });
  }
}
