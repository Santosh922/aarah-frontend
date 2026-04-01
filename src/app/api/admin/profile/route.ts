import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('aarah_admin_token')?.value;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET!) as { id: string }; } 
  catch { return null; }
}

export async function GET(request: Request) {
  try {
    const adminSession = await verifyAdmin();
    if (!adminSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id !== adminSession.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, name: true, email: true }
    });

    if (!admin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const nameParts = admin.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    return NextResponse.json({
        id: admin.id,
        firstName,
        lastName,
        email: admin.email,
        phone: ''
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminSession = await verifyAdmin();
    if (!adminSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (body.id !== adminSession.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const fullName = [body.firstName, body.lastName].filter(Boolean).join(' ').trim();

    await prisma.admin.update({
      where: { id: adminSession.id },
      data: { name: fullName }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
