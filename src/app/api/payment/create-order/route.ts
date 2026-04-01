import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import Razorpay from 'razorpay';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import prisma from '@/lib/prisma';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const SHIPPING_FEE = 99;
const FREE_SHIPPING_THRESHOLD = 2000;

interface ClientItem {
  id: string;
  quantity: number;
  variantId?: string;
}

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS.PAYMENT);
  if (rl) return rl;

  const cookieStore = await cookies();
  const token = cookieStore.get('aarah_customer_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
  } catch {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  try {
    const { items, clientAmount, discountCode, receipt } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!clientAmount) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }

    const itemIds = items.map((i: ClientItem) => i.id);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: itemIds }, status: 'Active' },
      include: { variants: true }
    });

    let subtotal = 0;
    for (const clientItem of items as ClientItem[]) {
      const product = dbProducts.find(p => p.id === clientItem.id);
      if (!product) {
        return NextResponse.json({ error: `Product no longer available` }, { status: 400 });
      }
      subtotal += product.price * clientItem.quantity;
    }

    let discountAmount = 0;
    if (discountCode) {
      const discount = await prisma.discount.findUnique({
        where: { code: discountCode }
      });
      if (discount && discount.isActive) {
        const now = new Date();
        const startOk = !discount.startDate || now >= new Date(discount.startDate);
        const endOk = !discount.endDate || now <= new Date(discount.endDate);
        const usageOk = !discount.usageLimit || discount.usedCount < discount.usageLimit;
        const minOk = !discount.minRequirementValue || subtotal >= discount.minRequirementValue;
        if (startOk && endOk && usageOk && minOk) {
          const type = discount.type.toUpperCase();
          if (type === 'PERCENTAGE' || discount.type === 'percentage') {
            discountAmount = Math.round(subtotal * (discount.value / 100));
          } else if (type === 'FIXED' || type === 'FIXED_AMOUNT' || discount.type === 'fixed_amount') {
            discountAmount = Math.min(discount.value, subtotal);
          }
        }
      }
    }

    const subtotalAfterDiscount = subtotal - discountAmount;
    const shippingCost = subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const serverTotal = subtotalAfterDiscount + shippingCost;
    const serverTotalPaisa = Math.round(serverTotal * 100);
    const clientAmountPaisa = Math.round(Number(clientAmount) * 100);

    if (Math.abs(clientAmountPaisa - serverTotalPaisa) > 100) {
      console.error('[AMOUNT_MISMATCH]', { clientAmountPaisa, serverTotalPaisa, difference: clientAmountPaisa - serverTotalPaisa });
      return NextResponse.json(
        { error: 'Price mismatch. Please refresh and try again.' },
        { status: 400 }
      );
    }

    const options = {
      amount: serverTotalPaisa,
      currency: 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[RAZORPAY_CREATE_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
