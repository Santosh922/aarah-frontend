import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentCustomer } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const auth = await getCurrentCustomer(request);
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: auth.customer.id },
      select: {
        id: true,
        customerId: true,
        name: true,
        email: true,
        phone: true,
        loyaltyTier: true,
        loyaltyPoints: true,
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('[PROFILE_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getCurrentCustomer(request);
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone } = body;

    if (name !== undefined && name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
    }

    if (email !== undefined && email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (phone !== undefined && phone && !/^[0-9]{10}$/.test(phone)) {
      return NextResponse.json({ error: 'Phone must be exactly 10 digits' }, { status: 400 });
    }

    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email?.trim().toLowerCase() || '';
    if (phone !== undefined) updateData.phone = phone?.trim();

    const updatedCustomer = await prisma.customer.update({
      where: { id: auth.customer.id },
      data: updateData,
      select: {
        id: true,
        customerId: true,
        name: true,
        email: true,
        phone: true,
      }
    });

    return NextResponse.json(updatedCustomer);
  } catch (error: any) {
    console.error('[PROFILE_UPDATE_ERROR]', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
