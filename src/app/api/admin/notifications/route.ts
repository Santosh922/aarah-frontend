import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '15');

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({
        where: { read: false }
      })
    ]);

    return NextResponse.json({ notifications, unreadCount }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
