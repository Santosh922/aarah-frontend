import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';

export async function GET() {
  try {
    const posts = await prisma.instagramPost.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const post = await prisma.instagramPost.create({
      data: {
        imageUrl: body.imageUrl,
        link: body.link || '',
        caption: body.caption || null,
        sortOrder: body.sortOrder || 1,
      }
    });
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const { id, ...data } = await request.json();
    const updated = await prisma.instagramPost.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}
