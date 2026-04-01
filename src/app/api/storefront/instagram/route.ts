import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const posts = await prisma.instagramPost.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      take: 12
    });
    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
