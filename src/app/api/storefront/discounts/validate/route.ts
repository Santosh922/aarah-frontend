import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { code, cartTotal, cartProductIds } = await request.json();

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Please enter a coupon code' });
    }

    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('aarah_customer_token')?.value;
      if (token) {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET!) as { id: string, userId?: string };
        userId = decoded.id || decoded.userId || null;
      }
    } catch {}

    const discount = await prisma.discount.findUnique({
      where: { code: code.toUpperCase().trim() }
    });

    if (!discount) {
      return NextResponse.json({ valid: false, error: 'Invalid coupon code.' });
    }

    if (!discount.isActive) {
      return NextResponse.json({ valid: false, error: 'This coupon is not active.' });
    }

    const now = new Date();

    if (discount.startDate && now < new Date(discount.startDate)) {
      return NextResponse.json({ valid: false, error: 'This coupon is not active yet.' });
    }

    if (discount.endDate && now > new Date(discount.endDate)) {
      return NextResponse.json({ valid: false, error: 'This coupon has expired.' });
    }

    if (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) {
      return NextResponse.json({ valid: false, error: 'This coupon usage limit has been reached.' });
    }

    if (discount.oncePerCustomer && userId) {
      const previousOrder = await prisma.order.findFirst({
        where: {
          customerId: userId,
          discountCode: code.toUpperCase().trim(),
        },
      });
      if (previousOrder) {
        return NextResponse.json({ valid: false, error: 'You have already used this coupon.' });
      }
    }

    if (discount.minRequirementValue && cartTotal < discount.minRequirementValue) {
      return NextResponse.json({ valid: false, error: `Minimum order value of ₹${discount.minRequirementValue} required.` });
    }

    if (discount.appliesTo === 'specific_products') {
      const pIds = cartProductIds || [];
      const hasMatch = pIds.some((id: string) => discount.selectedProductIds.includes(id));
      if (!hasMatch) {
         return NextResponse.json({ valid: false, error: 'This coupon is not applicable to the products in your cart.' });
      }
    }

    const rawType = discount.type.toLowerCase();
    const normalizedType = 
      rawType === 'percentage' ? 'PERCENTAGE' :
      rawType === 'fixed_amount' || rawType === 'fixed' ? 'FIXED' :
      rawType === 'free_shipping' ? 'FREE_SHIPPING' :
      discount.type.toUpperCase();

    let desc = '';
    if (normalizedType === 'PERCENTAGE') {
      desc = `Get ${discount.value}% off!`;
    } else if (normalizedType === 'FIXED') {
      desc = `Get ₹${discount.value} off!`;
    } else if (normalizedType === 'FREE_SHIPPING') {
      desc = 'Free shipping on your order!';
    } else {
      desc = 'Special offer';
    }

    return NextResponse.json({
      valid: true,
      code: discount.code,
      type: normalizedType,
      value: discount.value,
      minOrderValue: discount.minRequirementValue,
      desc,
      terms: discount.minRequirementValue > 0 ? `Valid on orders above ₹${discount.minRequirementValue}` : 'No minimum order required',
      appliesTo: discount.appliesTo,
      selectedProductIds: discount.selectedProductIds,
      selectedCategoryIds: discount.selectedCategoryIds
    });

  } catch (error) {
    console.error('[COUPON_VALIDATE_ERROR]', error);
    return NextResponse.json({ valid: false, error: 'Failed to validate coupon at this time' });
  }
}
