import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getCurrentCustomer } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    const auth = await getCurrentCustomer(request);
    if (!auth.authorized || !auth.customer) {
      return NextResponse.json({ verified: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await request.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ verified: false, error: 'Missing parameters' }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET!;
    
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      console.error('[RAZORPAY_VERIFY] ❌ Signature mismatch - Possible fraud attempt');
      return NextResponse.json({ verified: false, error: 'Invalid signature' }, { status: 400 });
    }

    await prisma.order.updateMany({
      where: { 
        id: razorpayOrderId, 
        customerId: auth.customer.id,
        status: { notIn: ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'] }
      },
      data: {
        paymentId: razorpayPaymentId,
        status: 'CONFIRMED',
      }
    });

    console.log(`[RAZORPAY_VERIFY] ✅ Payment verified for order: ${razorpayOrderId}`);
    return NextResponse.json({ verified: true }, { status: 200 });

  } catch (error) {
    console.error('[RAZORPAY_VERIFY_ERROR]', error);
    return NextResponse.json({ verified: false, error: 'Internal server error' }, { status: 500 });
  }
}
