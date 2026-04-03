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

    const formattedCoupons = discounts.map((d) => {
      const rawType = d.type.toLowerCase();
      const normalizedType = 
        rawType === 'percentage' ? 'PERCENTAGE' :
        rawType === 'fixed_amount' || rawType === 'fixed' ? 'FIXED' :
        rawType === 'free_shipping' ? 'FREE_SHIPPING' :
        d.type.toUpperCase();

      let desc = '';
      if (normalizedType === 'PERCENTAGE') desc = `Get ${d.value}% off on your order!`;
      else if (normalizedType === 'FIXED') desc = `Get ₹${d.value} off on your order!`;
      else if (normalizedType === 'FREE_SHIPPING') desc = 'Free shipping on your order!';
      else desc = 'Special offer on your order!';

      return {
        code: d.code,
        desc,
        terms: d.minRequirementValue > 0 
          ? `Valid on orders above ₹${d.minRequirementValue}` 
          : 'No minimum order required',
        type: normalizedType,
        value: d.value,
        minOrderValue: d.minRequirementValue,
        appliesTo: d.appliesTo,
        selectedProductIds: d.selectedProductIds,
        selectedCategoryIds: d.selectedCategoryIds
      };
    });

    return NextResponse.json(formattedCoupons);
  } catch (error) {
    console.error('[DISCOUNTS_GET_ERROR]', error);
    return NextResponse.json([], { status: 500 });
  }
}
