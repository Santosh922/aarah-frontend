import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkAdminAccess } from '@/lib/server-auth';

export async function POST(request: Request) {
  const auth = await checkAdminAccess();
  if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

  try {
    const { id, currentPassword, newPassword } = await request.json();
    
    if (id !== auth.admin!.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (newPassword.length < 8) return NextResponse.json({ error: 'Password too short' }, { status: 400 });

    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({
      where: { id },
      data: { passwordHash: hashedNewPassword }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
