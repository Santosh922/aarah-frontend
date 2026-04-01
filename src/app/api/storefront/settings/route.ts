import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function GET() {
  try {
    let settings = await prisma.storeSettings.findUnique({ where: { id: 'global' } });
    
    if (!settings) {
        settings = await prisma.storeSettings.create({
            data: { 
              id: 'global', 
              storeName: 'AARAH', 
              currency: 'INR', 
              email: 'support@aarah.in', 
              instagramHandle: '@aarah',
              instagramUrl: 'https://instagram.com'
            }
        });
    }
    
    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    return NextResponse.json({}, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('aarah_admin_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    jwt.verify(token, process.env.JWT_SECRET!);

    const body = await request.json();

    const updated = await prisma.storeSettings.upsert({
      where: { id: 'global' },
      update: {
        storeName: body.storeName,
        currency: body.currency,
        email: body.email,
        phone: body.phone,
        address: body.address,
        instagramUrl: body.instagramUrl,
        instagramHandle: body.instagramHandle,
        storyKicker: body.storyKicker,
        storyTitle: body.storyTitle,
        storyDescription: body.storyDescription,
        storyImageUrl: body.storyImageUrl,
        selectedStoryVideoId: body.selectedStoryVideoId,
        trustBadges: body.trustBadges,
      },
      create: {
        id: 'global',
        storeName: body.storeName || 'AARAH',
        currency: body.currency || 'INR',
        email: body.email || 'support@aarah.in',
        phone: body.phone || '',
        address: body.address || '',
        instagramUrl: body.instagramUrl || 'https://instagram.com',
        instagramHandle: body.instagramHandle || '@aarah',
      }
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
