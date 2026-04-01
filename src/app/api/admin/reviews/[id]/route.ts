import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('aarah_admin_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    jwt.verify(token, process.env.JWT_SECRET!);

    const { id } = await params;
    const { status } = await request.json();

    if (!status || !['PENDING', 'PUBLISHED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: { 
        status: status,
        approved: status === 'PUBLISHED'
      }
    });

    return NextResponse.json(updatedReview, { status: 200 });
  } catch (error) {
    console.error('[ADMIN_REVIEWS_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}
