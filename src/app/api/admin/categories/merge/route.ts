import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { sourceId, targetId } = await request.json();

    if (sourceId === targetId) return NextResponse.json({ error: 'Cannot merge into itself' }, { status: 400 });

    await prisma.$transaction([
      prisma.product.updateMany({
        where: { categoryId: sourceId },
        data: { categoryId: targetId }
      }),
      prisma.category.delete({
        where: { id: sourceId }
      })
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to merge categories' }, { status: 500 });
  }
}
