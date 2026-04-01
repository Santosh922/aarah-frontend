import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { status: 'Active' },
      select: { id: true, name: true, slug: true, imageUrl: true },
      orderBy: { sortOrder: 'asc' }
    });
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
