import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';

const LEGACY_NORM: Record<string, string> = {
  'new_arrival': 'new_arrivals',
  'best_seller': 'best_sellers',
};
function normPos(pos: string | undefined): string {
  if (!pos) return 'hero_main';
  const l = pos.toLowerCase().trim();
  return LEGACY_NORM[l] ?? l;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const banner = await prisma.banner.findUnique({ where: { id } });

    if (!banner) return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    return NextResponse.json(banner);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch banner' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const { title, subtitle, imageUrl, isActive, buttonText, buttonLink, sortOrder, position } = body;

    const updated = await prisma.banner.update({
      where: { id },
      data: {
        title: title ?? undefined,
        subtitle: subtitle ?? undefined,
        imageUrl: imageUrl ?? undefined,
        isActive: isActive ?? undefined,
        buttonText: buttonText ?? undefined,
        buttonLink: buttonLink ?? undefined,
        sortOrder: sortOrder ?? undefined,
        position: position ? normPos(position) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[BANNER_UPDATE_ERROR]', error);
    if (error.code === 'P2025') return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.banner.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
  }
}
