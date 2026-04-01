import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentCustomer } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const auth = await getCurrentCustomer(request);
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const addresses = await prisma.address.findMany({
      where: { customerId: auth.customer.id },
      orderBy: { isDefault: 'desc' }
    });

    return NextResponse.json(addresses);
  } catch (error) {
    console.error('[ADDRESSES_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getCurrentCustomer(request);
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, address, city, state, postalCode, isDefault } = body;

    if (!name || !phone || !address || !city || !postalCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { customerId: auth.customer.id },
        data: { isDefault: false }
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        customerId: auth.customer.id,
        name,
        phone,
        address,
        city,
        state: state || '',
        postalCode,
        isDefault: isDefault || false,
      }
    });

    return NextResponse.json(newAddress, { status: 201 });
  } catch (error) {
    console.error('[ADDRESS_CREATE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getCurrentCustomer(request);
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, phone, address, city, state, postalCode, isDefault } = body;

    if (!id) {
      return NextResponse.json({ error: 'Address ID required' }, { status: 400 });
    }

    const existingAddress = await prisma.address.findUnique({
      where: { id }
    });

    if (!existingAddress || existingAddress.customerId !== auth.customer.id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { customerId: auth.customer.id },
        data: { isDefault: false }
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: {
        name,
        phone,
        address,
        city,
        state: state || '',
        postalCode,
        isDefault: isDefault || false,
      }
    });

    return NextResponse.json(updatedAddress);
  } catch (error) {
    console.error('[ADDRESS_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getCurrentCustomer(request);
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Address ID required' }, { status: 400 });
    }

    const existingAddress = await prisma.address.findUnique({
      where: { id }
    });

    if (!existingAddress || existingAddress.customerId !== auth.customer.id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    await prisma.address.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADDRESS_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
