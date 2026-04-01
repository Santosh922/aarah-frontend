import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const position = searchParams.get('position');

  try {
    const banners = await prisma.banner.findMany({
      where: { 
        isActive: true,
        ...(position ? { position } : {}) 
      },
      orderBy: { sortOrder: 'asc' }
    });
    return NextResponse.json(banners);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
