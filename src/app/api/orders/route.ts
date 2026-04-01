import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import Razorpay from 'razorpay';
import { sendInvoiceEmail } from '@/lib/mail';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const generateOrderId = () => {
  const date = new Date();
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ARH-${d}${m}-${random}`;
};

const SHIPPING_FEE = 99;
const FREE_SHIPPING_THRESHOLD = 2000;

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('aarah_customer_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized. Please log in to place an order.' }, { status: 401 });
    }

    let verifiedCustomerId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      verifiedCustomerId = decoded.id;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid or expired session. Please log in again.' }, { status: 401 });
    }

    const body = await request.json();
    const { items, discountCode, paymentId, shippingAddress, paymentMode } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }

    if (!shippingAddress) {
      return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 });
    }

    const rzpPayment = await razorpay.payments.fetch(paymentId);
    if (rzpPayment.status !== 'captured') {
      return NextResponse.json({ error: 'Payment not verified or captured' }, { status: 400 });
    }

    const itemIds = items.map((item: any) => item.id);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: itemIds } },
      include: { variants: true }
    });

    let serverSubtotal = 0;
    const orderItems: any[] = [];

    for (const clientItem of items) {
      const dbProduct = dbProducts.find(p => p.id === clientItem.id);
      if (!dbProduct) {
        return NextResponse.json({ error: 'Product not found' }, { status: 400 });
      }
      if (dbProduct.status !== 'Active') {
        return NextResponse.json({ error: `Product "${dbProduct.name}" is not available` }, { status: 400 });
      }

      if (clientItem.variantId) {
        const variant = dbProduct.variants.find(v => v.id === clientItem.variantId);
        if (!variant) {
          return NextResponse.json({ error: 'Variant not found' }, { status: 400 });
        }
        if (variant.stock < clientItem.quantity) {
          return NextResponse.json({ error: `Insufficient stock for "${dbProduct.name}" (${variant.size})` }, { status: 400 });
        }
      }

      const itemTotal = dbProduct.price * clientItem.quantity;
      serverSubtotal += itemTotal;

      orderItems.push({
        productId: dbProduct.id,
        variantId: clientItem.variantId || null,
        name: dbProduct.name,
        sku: clientItem.sku || dbProduct.sku || '',
        size: clientItem.size || '',
        image: clientItem.image || '',
        price: dbProduct.price,
        quantity: clientItem.quantity
      });
    }

    let discountAmount = 0;
    let appliedDiscount: any = null;

    if (discountCode) {
      const discount = await prisma.discount.findUnique({
        where: { code: discountCode }
      });

      if (discount && discount.isActive) {
        const now = new Date();
        const startOk = !discount.startDate || now >= new Date(discount.startDate);
        const endOk = !discount.endDate || now <= new Date(discount.endDate);
        const usageOk = !discount.usageLimit || discount.usedCount < discount.usageLimit;
        const minOk = !discount.minRequirementValue || serverSubtotal >= discount.minRequirementValue;

        if (startOk && endOk && usageOk && minOk) {
          const type = discount.type.toUpperCase();
          if (type === 'PERCENTAGE' || discount.type === 'percentage') {
            discountAmount = Math.round(serverSubtotal * (discount.value / 100));
          } else if (type === 'FIXED' || type === 'FIXED_AMOUNT' || discount.type === 'fixed_amount') {
            discountAmount = Math.min(discount.value, serverSubtotal);
          }
          appliedDiscount = discount;
        }
      }
    }

    const subtotalAfterDiscount = serverSubtotal - discountAmount;
    const shippingCost = subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const serverTotal = subtotalAfterDiscount + shippingCost;
    const serverTotalPaisa = Math.round(Number(serverTotal) * 100);
    const rzpAmount = Number(rzpPayment.amount);

    if (rzpAmount !== serverTotalPaisa) {
      console.error('[FINANCIAL_MISMATCH]', {
        razorpayAmount: rzpAmount,
        serverTotalPaisa,
        difference: rzpAmount - serverTotalPaisa
      });
      return NextResponse.json({ error: 'Financial mismatch detected. Order rejected.' }, { status: 400 });
    }

    const friendlyOrderId = generateOrderId();

    const result = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderId: friendlyOrderId,
          status: 'CONFIRMED',
          customerId: verifiedCustomerId,
          subtotal: serverSubtotal,
          discount: discountAmount,
          discountCode: appliedDiscount ? appliedDiscount.code : null,
          shipping: shippingCost,
          total: serverTotal,
          paymentMode: paymentMode || 'ONLINE',
          paymentId: paymentId,
          shippingName: shippingAddress.name,
          shippingLine1: shippingAddress.line1 || shippingAddress.address,
          shippingCity: shippingAddress.city,
          shippingState: shippingAddress.state,
          shippingPostal: shippingAddress.postalCode,
          shippingPhone: shippingAddress.phone,
          shippingEmail: shippingAddress.email,
          items: {
            create: orderItems
          }
        },
        include: { items: true }
      });

      if (appliedDiscount) {
        await tx.discount.update({
          where: { code: appliedDiscount.code },
          data: { usedCount: { increment: 1 } }
        });
      }

      for (const item of orderItems) {
        if (item.variantId) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } }
          });
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { totalStock: { decrement: item.quantity } }
        });
      }

      return newOrder;
    });

    const formattedDate = result.createdAt.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    sendInvoiceEmail({
      customer: {
        name: shippingAddress.name || 'Customer',
        email: shippingAddress.email
      },
      items: orderItems,
      total: serverTotal,
      orderId: result.orderId
    }).catch((mailError) => {
      console.error(`[INVOICE_EMAIL_ERROR] Failed to send invoice for order ${result.orderId}:`, mailError);
    });

    return NextResponse.json({
      id: result.id,
      orderId: result.orderId,
      date: formattedDate,
      message: 'Order placed successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[SECURE_ORDER_ERROR]', error);
    return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
  }
}
