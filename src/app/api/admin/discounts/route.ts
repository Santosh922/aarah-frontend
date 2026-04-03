import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const discounts = await prisma.discount.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(discounts, { status: 200 });
  } catch (error) {
    console.error('[ADMIN_GET_DISCOUNTS_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch discounts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const codeStr = body.code?.trim().toUpperCase();
    if (!codeStr) {
      return NextResponse.json({ error: 'Discount code is required' }, { status: 400 });
    }

    const existing = await prisma.discount.findUnique({ where: { code: codeStr } });
    if (existing) {
      return NextResponse.json({ error: 'Discount code already exists' }, { status: 409 });
    }

    const newDiscount = await prisma.discount.create({
      data: {
        code: codeStr,
        type: body.type,
        value: parseFloat(body.value) || 0,
        isActive: body.isActive ?? true,
        buyQuantity: body.buyQuantity || 1,
        minRequirementType: body.minRequirementType || 'none',
        minRequirementValue: body.minRequirementValue || 0,
        appliesTo: body.appliesTo || 'all',
        selectedCategoryIds: Array.isArray(body.selectedCategoryIds) ? body.selectedCategoryIds : [],
        selectedProductIds: Array.isArray(body.selectedProductIds) ? body.selectedProductIds : [],
        usageLimit: body.usageLimit || null,
        oncePerCustomer: body.oncePerCustomer || false,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
      }
    });

    return NextResponse.json(newDiscount, { status: 201 });
  } catch (error) {
    console.error('[ADMIN_CREATE_DISCOUNT_ERROR]', error);
    return NextResponse.json({ error: 'Failed to create discount' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Discount ID is required' }, { status: 400 });
    }

    if (updateData.code) {
      updateData.code = updateData.code.trim().toUpperCase();
      const existing = await prisma.discount.findUnique({ where: { code: updateData.code } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Discount code already exists' }, { status: 409 });
      }
    }

    const updatedDiscount = await prisma.discount.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updatedDiscount, { status: 200 });
  } catch (error) {
    console.error('[ADMIN_UPDATE_DISCOUNT_ERROR]', error);
    return NextResponse.json({ error: 'Failed to update discount' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Discount ID is required' }, { status: 400 });
    }

    await prisma.discount.delete({
      where: { id: body.id }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[ADMIN_DELETE_DISCOUNT_ERROR]', error);
    return NextResponse.json({ error: 'Failed to delete discount' }, { status: 500 });
  }
}
