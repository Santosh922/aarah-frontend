import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';

const VALID_POSITIONS = [
  'hero_main',
  'new_arrivals',
  'best_sellers',
  'mama_story',
  'journey_banner',
  'promo_bento',
  'feature_blocks',
  'footer_promo',
  'about_section',
  'contact_section',
  'story_video',
] as const;

function normalizePosition(pos: string | undefined): string {
  if (!pos) return 'hero_main';
  const lower = pos.toLowerCase().trim();
  // Normalize legacy mismatches
  if (lower === 'new_arrival') return 'new_arrivals';
  if (lower === 'best_seller') return 'best_sellers';
  // Fallback to valid or default
  return VALID_POSITIONS.includes(lower as typeof VALID_POSITIONS[number]) ? lower : 'hero_main';
}

export async function GET() {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const banners = await prisma.banner.findMany({
      orderBy: [
        { position: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    return NextResponse.json(banners, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    
    const newBanner = await prisma.banner.create({
      data: {
        title: body.title || null,
        subtitle: body.subtitle || null,
        buttonText: body.buttonText || null,
        buttonLink: body.buttonLink || null,
        imageUrl: body.imageUrl,
        videoUrl: body.videoUrl || null,
        position: normalizePosition(body.position),
        isActive: body.isActive ?? true,
        sortOrder: Number(body.sortOrder) || 1,
      }
    });

    return NextResponse.json(newBanner, { status: 201 });
  } catch (error) {
    console.error('[BANNER_CREATE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: 'Banner ID required' }, { status: 400 });

    // Normalize position if provided
    const data: Record<string, unknown> = { ...updateData };
    if (data.position) data.position = normalizePosition(data.position as string);

    const updatedBanner = await prisma.banner.update({
      where: { id },
      data
    });

    return NextResponse.json(updatedBanner, { status: 200 });
  } catch (error) {
    console.error('[BANNER_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }
}

// Migration endpoint — run once to fix legacy position values in DB
export async function PUT() {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const legacy: Record<string, string> = {
      'new_arrival': 'new_arrivals',
      'best_seller': 'best_sellers',
    };

    const legacyPositions = Object.keys(legacy);
    const affected = await prisma.banner.findMany({
      where: { position: { in: legacyPositions } },
      select: { id: true, position: true }
    });

    let migrated = 0;
    for (const banner of affected) {
      const newPos = legacy[banner.position];
      if (newPos) {
        await prisma.banner.update({ where: { id: banner.id }, data: { position: newPos } });
        migrated++;
      }
    }

    return NextResponse.json({ success: true, migrated, affected: affected.length });
  } catch (error) {
    console.error('[BANNER_MIGRATE_ERROR]', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
