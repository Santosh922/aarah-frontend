import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        fabric: { not: null, notIn: [''] },
        status: 'Active',
      },
      select: { fabric: true },
      distinct: ['fabric'],
      orderBy: { fabric: 'asc' },
    });

    const fabrics = products
      .map(p => p.fabric)
      .filter(Boolean) as string[];

    return NextResponse.json(fabrics);
  } catch (error) {
    console.error('[FABRICS_API_ERROR]', error);
    return NextResponse.json([], { status: 500 });
  }
}
