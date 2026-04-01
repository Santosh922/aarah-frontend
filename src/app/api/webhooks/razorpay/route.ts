import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
      console.error('[WEBHOOK] Missing signature or secret');
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyText)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('[WEBHOOK] 🚨 INVALID SIGNATURE - Possible attack attempt');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const event = JSON.parse(bodyText);
    console.log(`[WEBHOOK] Received event: ${event.event}`);

    switch (event.event) {
      case 'payment.captured':
      case 'order.paid': {
        const paymentData = event.payload.payment.entity;
        const razorpayOrderId = paymentData.order_id;
        const razorpayPaymentId = paymentData.id;

        console.log(`[WEBHOOK] Payment captured: ${razorpayPaymentId} for order: ${razorpayOrderId}`);

        const existingOrder = await prisma.order.findFirst({
          where: { id: razorpayOrderId },
          select: { id: true, status: true },
        });

        if (!existingOrder) {
          console.error(`[WEBHOOK] Order not found: ${razorpayOrderId}`);
          break;
        }

        if (['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'].includes(existingOrder.status)) {
          console.log(`[WEBHOOK] Order ${razorpayOrderId} already in terminal/completed state (${existingOrder.status}), skipping duplicate webhook.`);
          break;
        }

        await prisma.order.updateMany({
          where: { id: razorpayOrderId },
          data: {
            paymentId: razorpayPaymentId,
            status: 'CONFIRMED',
          }
        });

        console.log(`✅ Order ${razorpayOrderId} marked as CONFIRMED`);
        break;
      }

      case 'payment.failed': {
        const paymentData = event.payload.payment.entity;
        const razorpayOrderId = paymentData.order_id;
        const failureReason = paymentData.error_description || paymentData.error_code || 'Payment failed';

        console.log(`[WEBHOOK] Payment failed for order ${razorpayOrderId}: ${failureReason}`);

        await prisma.order.updateMany({
          where: { id: razorpayOrderId, status: { notIn: ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'] } },
          data: {
            status: 'PAYMENT_FAILED',
          }
        });

        console.log(`❌ Order ${razorpayOrderId} marked as PAYMENT_FAILED`);
        break;
      }

      case 'refund.created': {
        const refundData = event.payload.refund.entity;
        const paymentId = refundData.payment_id;

        console.log(`[WEBHOOK] Refund created for payment: ${paymentId}`);

        await prisma.order.updateMany({
          where: { paymentId, status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] } },
          data: {
            status: 'REFUNDED',
          }
        });

        console.log(`💰 Order with payment ${paymentId} marked as REFUNDED`);
        break;
      }

      default:
        console.log(`[WEBHOOK] Unhandled event: ${event.event}`);
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
