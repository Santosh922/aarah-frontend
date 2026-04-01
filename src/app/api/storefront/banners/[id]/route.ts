import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const banner = await prisma.banner.findUnique({
      where: { id }
    });
    if (!banner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }
    return NextResponse.json(banner);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch banner' }, { status: 500 });
  }
}