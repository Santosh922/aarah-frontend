import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const variants = await prisma.variant.findMany({
      where: { stock: { gt: 0 } },
      select: { size: true },
      distinct: ['size'],
    });

    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size', 'One Size'];
    const sizes = variants
      .map(v => v.size)
      .filter(Boolean)
      .sort((a, b) => {
        const ai = sizeOrder.indexOf(a);
        const bi = sizeOrder.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

    return NextResponse.json(sizes);
  } catch (error) {
    console.error('[SIZES_API_ERROR]', error);
    return NextResponse.json([], { status: 500 });
  }
}
