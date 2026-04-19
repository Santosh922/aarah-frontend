'use client';

import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, ShieldCheck, CreditCard, Smartphone, Building2, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';
import { getClientAuthHeaders } from '@/lib/integrationAdapters';
import type { Address, CartItem } from '@/types';

function numFromApi(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const RZP_KEY  = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';

declare global {
  interface Window { Razorpay: any; }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function PaymentContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const mode         = searchParams.get('mode');
  const { cartItems, cartTotal, addresses, clearCart, openCart } = useCart();
  const { currentUser } = useAuth();

  const [mounted, setMounted]           = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [paymentItems, setPaymentItems] = useState<CartItem[]>([]);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderError, setOrderError]     = useState<string | null>(null);
  const [orderDismissed, setOrderDismissed] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<Address | null>(null);

  /** Code label only; amounts match checkout / validate API. */
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [freeShippingFromCoupon, setFreeShippingFromCoupon] = useState(false);
  const [finalShipping, setFinalShipping] = useState(99);
  const [finalTotal, setFinalTotal] = useState(0);

  useEffect(() => {
    const storedAddressId = sessionStorage.getItem('aarah_checkout_address_id');
    if (!storedAddressId) {
      router.replace('/checkout');
      return;
    }

    const foundAddress = addresses.find((addr: any) => addr.id === Number(storedAddressId));
    if (!foundAddress) {
      sessionStorage.removeItem('aarah_checkout_address_id');
      router.replace('/checkout');
      return;
    }

    setDeliveryAddress(foundAddress);
    setIsValidating(false);
  }, [addresses, router]);

  useEffect(() => {
    if (isValidating) return;
    setMounted(true);

    let resolvedItems: CartItem[] = cartItems;
    let resolvedSubtotal = cartTotal;

    if (mode === 'buynow') {
      const buyNow = sessionStorage.getItem('aarah_buy_now');
      if (buyNow) {
        try {
          resolvedItems = JSON.parse(buyNow);
          resolvedSubtotal = resolvedItems.reduce((s, i) => s + i.price * i.quantity, 0);
        } catch {
          resolvedItems = cartItems;
          resolvedSubtotal = cartTotal;
        }
      }
    }

    setPaymentItems(resolvedItems);
    setPaymentTotal(resolvedSubtotal);

    const checkoutSummaryStr = sessionStorage.getItem('aarah_checkout_summary');
    if (checkoutSummaryStr) {
      try {
        const summary = JSON.parse(checkoutSummaryStr);
        if (summary.appliedCoupon?.code) {
          setAppliedCoupon({ code: String(summary.appliedCoupon.code) });
        } else {
          setAppliedCoupon(null);
        }
        if (summary.discountAmount !== undefined) setDiscountAmount(numFromApi(summary.discountAmount));
        if (summary.shippingFee !== undefined) setFinalShipping(numFromApi(summary.shippingFee));
        if (summary.finalTotal !== undefined) setFinalTotal(numFromApi(summary.finalTotal));
        setFreeShippingFromCoupon(Boolean(summary.freeShipping));
      } catch (e) {
        console.error('Failed to parse checkout summary', e);
      }
    } else {
      const savedResultStr = sessionStorage.getItem('aarah_coupon_validate_result');
      const savedCoupon = sessionStorage.getItem('aarah_applied_coupon');
      if (savedResultStr && savedCoupon) {
        try {
          const parsed = JSON.parse(savedCoupon) as { code?: string };
          const result = JSON.parse(savedResultStr) as {
            discountAmount?: unknown;
            freeShipping?: unknown;
            finalSubtotal?: unknown;
          };
          if (parsed?.code && result) {
            setAppliedCoupon({ code: parsed.code });
            setDiscountAmount(numFromApi(result.discountAmount));
            const subAfter = numFromApi(result.finalSubtotal);
            const freeShip = Boolean(result.freeShipping);
            setFreeShippingFromCoupon(freeShip);
            const ship = freeShip ? 0 : (subAfter >= 2000 ? 0 : 99);
            setFinalShipping(ship);
            setFinalTotal(subAfter + ship);
          }
        } catch {
          sessionStorage.removeItem('aarah_applied_coupon');
          sessionStorage.removeItem('aarah_coupon_validate_result');
          setAppliedCoupon(null);
          setDiscountAmount(0);
          setFreeShippingFromCoupon(false);
          const ship = resolvedSubtotal >= 2000 ? 0 : 99;
          setFinalShipping(ship);
          setFinalTotal(resolvedSubtotal + ship);
        }
      } else {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setFreeShippingFromCoupon(false);
        const ship = resolvedSubtotal >= 2000 ? 0 : 99;
        setFinalShipping(ship);
        setFinalTotal(resolvedSubtotal + ship);
      }
    }
  }, [mode, cartItems, cartTotal, isValidating]);

  // ── Main payment handler ──────────────────────────────────────────────────
  const handlePayNow = async () => {
    if (!deliveryAddress) { 
      setOrderError('Delivery address not found. Please go back and select an address.');
      return; 
    }
    setIsProcessing(true);
    setOrderError(null);

    try {
      // Step 1: Create Razorpay order on backend
      const createRes = await fetch(`${API_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: getClientAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
        clientAmount: finalTotal,
        items: paymentItems.map(i => ({ id: i.id, quantity: i.quantity, variantId: i.variantId })),
        discountCode: appliedCoupon?.code,
        receipt: `ARH-${Date.now()}`,
      }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to initiate payment');
      }

      const rzpOrder = await createRes.json();

      // Step 2: Load Razorpay script
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Razorpay failed to load. Check your internet connection.');

      // Step 3: Open Razorpay modal
      await new Promise<void>((resolve, reject) => {
        const options = {
          key:         rzpOrder.keyId || RZP_KEY,
          amount:      rzpOrder.amount,
          currency:    rzpOrder.currency || 'INR',
          name:        'Aarah',
          description: 'Maternity & Nursing Wear',
          order_id:    rzpOrder.id,
          prefill: {
            name:    deliveryAddress.name,
            contact: deliveryAddress.phone ? `+91${deliveryAddress.phone}` : '',
            email:   currentUser?.email || '',
          },
          theme: { color: '#191919' },

          handler: async (rzpResponse: any) => {
            try {
              // Step 4: Verify payment on backend
              const verifyRes = await fetch(`${API_URL}/api/payment/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpayOrderId:   rzpResponse.razorpay_order_id,
                  razorpayPaymentId: rzpResponse.razorpay_payment_id,
                  razorpaySignature: rzpResponse.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyData.verified) {
                reject(new Error('Payment verification failed. Contact support if money was deducted.'));
                return;
              }

              // Step 5: Place order
              await placeOrder(rzpResponse.razorpay_payment_id);
              resolve();
            } catch (e: any) {
              reject(e);
            }
          },

          modal: {
            ondismiss: () => reject(new Error('DISMISSED')),
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp: any) => {
          reject(new Error(resp.error?.description || 'Payment failed. Please try again.'));
        });
        rzp.open();
      });

    } catch (err: any) {
      if (err.message === 'DISMISSED') {
        setOrderDismissed(true);
      } else {
        setOrderError(err.message || 'Payment failed. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const placeOrder = async (paymentId: string) => {
    const orderPayload = {
      items: paymentItems.map(item => ({
        id:        item.id,
        productId: item.id,
        variantId: item.variantId || null,
        name:      item.name,
        sku:       item.sku || item.id,
        size:      item.size,
        image:     item.image,
        price:     item.price,
        quantity:  item.quantity,
      })),
      shippingAddress: {
        name:       deliveryAddress!.name,
        address:    deliveryAddress!.address,
        line1:      deliveryAddress!.address,
        city:       deliveryAddress!.city,
        state:      deliveryAddress!.state || '',
        postalCode: deliveryAddress!.postalCode,
        phone:      deliveryAddress!.phone,
        email:      currentUser?.email || '',
      },
      subtotal:     paymentTotal,
      discount:     discountAmount,
      discountCode: appliedCoupon?.code || null,
      shipping:     finalShipping,
      total:        finalTotal,
      paymentMode:  'Online',
      paymentId:    paymentId,
      customerId:   currentUser?.customerId || null,
      userId:       currentUser?.customerId || null,
    };

    const res = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: getClientAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(orderPayload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Order placement failed');
    }

    const orderData = await res.json();

    localStorage.setItem('aarah_last_order', JSON.stringify({
      orderId:  orderData.orderId,
      id:       orderData.id,
      date:     orderData.date,
      items:    paymentItems,
      subtotal: paymentTotal,
      discount: discountAmount,
      shipping: finalShipping,
      total:    finalTotal,
      address:  deliveryAddress,
    }));

    // ── FIX: Only clear coupon AFTER order is successfully placed ─────────
    if (mode === 'buynow') sessionStorage.removeItem('aarah_buy_now');
    sessionStorage.removeItem('aarah_applied_coupon');
    sessionStorage.removeItem('aarah_coupon_validate_result');
    sessionStorage.removeItem('aarah_checkout_summary');

    clearCart();
    router.push('/order-success');
  };

  if (!mounted || isValidating) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center pt-20">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );

  if (paymentItems.length === 0) {
    return (
      <main className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-4 pt-48 pb-20">
        <h1 className="font-serif text-3xl text-primary-dark mb-4 tracking-widest uppercase">Your Bag is Empty</h1>
        <Link href="/shop" className="bg-primary-dark text-white px-10 py-4 font-sans text-xs font-bold tracking-[0.2em] uppercase mt-4 hover:bg-black transition-colors">RETURN TO SHOP</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-48 pb-20">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center text-[11px] font-sans tracking-[0.1em] text-gray-500 mb-10">
          <button onClick={openCart} className="hover:text-primary-dark transition-colors cursor-pointer uppercase">Cart</button>
          <ChevronRight className="w-3 h-3 mx-2" />
          <Link href="/checkout" className="hover:text-primary-dark transition-colors uppercase">Shipping</Link>
          <ChevronRight className="w-3 h-3 mx-2" />
          <span className="text-primary-dark uppercase font-bold">Payment</span>
        </nav>

        <h1 className="font-serif text-3xl md:text-4xl text-primary-dark mb-10">Secure Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          <div className="lg:col-span-7 flex flex-col space-y-8">

            {/* Address summary */}
            {deliveryAddress ? (
              <div className="bg-white p-6 border border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center shadow-sm">
                <div>
                  <span className="font-sans text-[10px] text-gray-400 tracking-widest uppercase block mb-1">Delivering To</span>
                  <p className="font-sans text-xs text-primary-dark font-bold uppercase tracking-wider">{deliveryAddress.name} — {deliveryAddress.postalCode}</p>
                  <p className="font-sans text-[11px] text-gray-500 mt-1 uppercase truncate max-w-md">{deliveryAddress.address}, {deliveryAddress.city}</p>
                </div>
                <Link href="/checkout" className="font-sans text-[10px] text-gray-400 tracking-widest uppercase underline underline-offset-4 hover:text-primary-dark mt-4 sm:mt-0 transition-colors">Change</Link>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 p-4">
                <p className="font-sans text-[11px] text-amber-700 tracking-widest uppercase">
                  ⚠ No delivery address. <Link href="/checkout" className="underline">Go back to add one.</Link>
                </p>
              </div>
            )}

            {/* Payment method info */}
            <div className="bg-white border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-100 bg-[#F9F9F9] flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-green-600" strokeWidth={1.5} />
                <h2 className="font-sans text-[13px] font-bold text-primary-dark tracking-widest uppercase">Secure Payment</h2>
              </div>
              <div className="p-6">
                <p className="font-sans text-[11px] text-gray-500 uppercase tracking-widest mb-5">
                  Pay securely with Razorpay — supports UPI, cards, net banking and wallets.
                </p>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded">
                    <CreditCard className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                    <span className="font-sans text-[10px] text-gray-500 uppercase tracking-widest">Cards</span>
                  </div>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded">
                    <Smartphone className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                    <span className="font-sans text-[10px] text-gray-500 uppercase tracking-widest">UPI</span>
                  </div>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded">
                    <Building2 className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                    <span className="font-sans text-[10px] text-gray-500 uppercase tracking-widest">Net Banking</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 text-gray-400 bg-[#F9F9F9] p-6 border border-gray-100">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="font-sans text-[10px] tracking-wider leading-relaxed uppercase">
                256-bit SSL encryption. Powered by Razorpay — PCI DSS compliant.
              </p>
            </div>

            {orderError && (
              <div className="bg-red-50 border border-red-200 p-4">
                <p className="font-sans text-[11px] text-semantic-error tracking-widest uppercase">{orderError}</p>
              </div>
            )}

            {orderDismissed && (
              <div className="bg-[#FFF8E7] border border-[#F0D080] p-6 text-center">
                <p className="font-sans text-[11px] text-[#8A6500] tracking-widest uppercase font-bold mb-2">
                  Payment Cancelled
                </p>
                <p className="font-sans text-[11px] text-gray-600 leading-relaxed mb-5">
                  Your order is saved — nothing has been charged. Retry anytime or continue shopping.
                </p>
                <button
                  onClick={() => { setOrderDismissed(false); setOrderError(null); }}
                  className="bg-[#191919] text-white px-8 py-3 text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-colors"
                >
                  Retry Payment
                </button>
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-5 bg-[#F4F4F4] p-8 lg:p-10 border border-gray-100 shadow-sm sticky top-32">
            <h3 className="font-sans text-[11px] font-bold tracking-widest uppercase text-primary-dark mb-8">ORDER SUMMARY</h3>

            <div className="flex flex-col space-y-6 mb-8 max-h-[30vh] overflow-y-auto pr-2">
              {paymentItems.map(item => (
                <div key={`${item.id}-${item.size}`} className="flex space-x-4">
                  <div className="relative w-16 h-20 bg-gray-200 flex-shrink-0 border border-gray-200">
                    {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />}
                    <div className="absolute -top-2 -right-2 bg-primary-dark text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{item.quantity}</div>
                  </div>
                  <div className="flex flex-col flex-1 justify-center">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-sans text-[10px] font-bold text-primary-dark pr-4 uppercase tracking-widest line-clamp-1">{item.name}</h4>
                      <span className="font-sans text-[11px] font-bold text-primary-dark">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="font-sans text-[10px] text-gray-500 uppercase tracking-wider">SIZE: {item.size}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-6 space-y-4">
              <div className="flex justify-between text-[11px] font-sans tracking-widest uppercase">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-bold text-primary-dark">₹{paymentTotal.toLocaleString('en-IN')}</span>
              </div>
              {appliedCoupon && (discountAmount > 0 || freeShippingFromCoupon) && (
                <div className="flex justify-between text-[11px] font-sans tracking-widest uppercase">
                  <span className="text-gray-500">
                    Discount ({appliedCoupon.code})
                    {freeShippingFromCoupon ? ' (FREE SHIPPING)' : ''}
                  </span>
                  <span className="font-bold text-semantic-success">
                    {discountAmount > 0 ? `-₹${discountAmount.toLocaleString('en-IN')}` : 'APPLIED'}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[11px] font-sans tracking-widest uppercase">
                <span className="text-gray-500">Shipping</span>
                <span className="font-bold text-semantic-success">{finalShipping === 0 ? 'FREE' : `₹${finalShipping}`}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 mt-6 pt-6 flex justify-between items-end mb-8">
              <div className="flex flex-col">
                <span className="font-sans text-[11px] font-bold tracking-widest uppercase text-primary-dark mb-1">TOTAL</span>
                <span className="font-sans text-[9px] tracking-widest text-gray-400 uppercase">VAT INCLUDED</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-sans text-[9px] text-gray-400 mb-1">INR</span>
                <span className="font-sans text-2xl font-bold text-primary-dark">₹{finalTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={handlePayNow}
              disabled={isProcessing || !deliveryAddress || paymentItems.length === 0 || orderDismissed}
              className={`w-full flex items-center justify-center py-4 font-sans text-[12px] font-bold tracking-[0.2em] uppercase transition-all shadow-md ${isProcessing || !deliveryAddress ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#191919] text-white hover:bg-black'}`}
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : `PAY ₹${finalTotal.toLocaleString('en-IN')}`}
            </button>

            <p className="font-sans text-[9px] text-gray-400 text-center mt-3 tracking-widest uppercase">
              You'll be redirected to Razorpay to complete payment
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] pt-48"><Loader2 className="w-8 h-8 text-gray-300 animate-spin" /></div>}>
      <PaymentContent />
    </Suspense>
  );
}
