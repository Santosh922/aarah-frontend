import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('aarah_admin_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const adminSession = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

    const { id } = await params;
    if (adminSession.id === id) {
        return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    await prisma.admin.delete({
        where: { id }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
