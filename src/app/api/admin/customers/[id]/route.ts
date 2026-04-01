import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAdminAccess();
  if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    await prisma.customer.delete({
      where: { id }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
