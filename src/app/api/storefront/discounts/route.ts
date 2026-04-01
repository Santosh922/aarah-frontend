import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    
    const discounts = await prisma.discount.findMany({
      where: {
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedCoupons = discounts.map((d) => ({
      code: d.code,
      desc: d.type === 'PERCENTAGE' 
        ? `Get ${d.value}% off on your order!` 
        : `Get ₹${d.value} off on your order!`,
      terms: d.minRequirementValue > 0 
        ? `Valid on orders above ₹${d.minRequirementValue}` 
        : 'No minimum order required',
      type: d.type,
      value: d.value,
      minOrderValue: d.minRequirementValue
    }));

    return NextResponse.json(formattedCoupons);
  } catch (error) {
    console.error('[DISCOUNTS_GET_ERROR]', error);
    return NextResponse.json([], { status: 500 });
  }
}
