'use client';

import { API_URL } from '@/lib/api';
import Image from 'next/image';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Check, Pencil, Ticket, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

import CouponsModal from '@/components/modals/CouponsModal';
import ExchangePolicyModal from '@/components/modals/ExchangePolicyModal';
import AddressModal, { AddressData } from '@/components/modals/AddressModal';
import LoginModal from '@/components/modals/LoginModal';
import type { Coupon } from '@/types';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const { cartItems, cartTotal, openCart, addresses: contextAddresses, addAddress, editAddress } = useCart();
  const { isAuthenticated } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [localAddresses, setLocalAddresses] = useState<AddressData[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | undefined>(undefined);
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);
  const [checkoutTotal, setCheckoutTotal] = useState(0);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const [showPolicy, setShowPolicy] = useState(false);
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressData, setEditingAddressData] = useState<AddressData | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (cartItems.length === 0 && mode !== 'buynow') {
      router.replace('/shop');
      return;
    }

    let itemsToProcess = cartItems;
    if (mode === 'buynow') {
      const buyNowData = sessionStorage.getItem('aarah_buy_now');
      if (buyNowData) {
        try {
          itemsToProcess = JSON.parse(buyNowData);
        } catch { /* empty */ }
      }
    }
    
    setCheckoutItems(itemsToProcess);
    setCheckoutTotal(itemsToProcess.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0));
    setLocalAddresses(contextAddresses as AddressData[]);
    if (contextAddresses.length > 0) {
      setSelectedAddress(contextAddresses[contextAddresses.length - 1].id);
    }

    const savedCoupon = sessionStorage.getItem('aarah_applied_coupon');
    if (savedCoupon) {
      try {
        const parsed = JSON.parse(savedCoupon);
        setAppliedCoupon(parsed);
        setCouponInput(parsed.code);
      } catch {
        sessionStorage.removeItem('aarah_applied_coupon');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextAddresses, cartItems, mode]);

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/discounts`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Coupon[]) => setCoupons(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const validateCoupon = async (code: string) => {
    if (!code.trim()) return;
    setIsValidatingCoupon(true);
    setCouponFeedback(null);
    try {
      const res = await fetch(`${API_URL}/api/storefront/discounts/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), cartTotal: checkoutTotal, cartProductIds: checkoutItems.map(i => i.id) }),
      });
      const data = await res.json();
      if (data.valid) {
        const coupon: Coupon = {
          code: data.code,
          type: data.type,
          value: data.value,
          desc: data.desc,
          terms: data.terms,
          minOrderValue: data.minOrderValue,
          appliesTo: data.appliesTo,
          selectedProductIds: data.selectedProductIds,
          selectedCategoryIds: data.selectedCategoryIds,
        };
        applyCoupon(coupon);
        setCouponFeedback({ type: 'success', text: `${data.desc} applied!` });
      } else {
        setCouponFeedback({ type: 'error', text: data.error || 'Invalid coupon code.' });
      }
    } catch {
      setCouponFeedback({ type: 'error', text: 'Failed to validate coupon.' });
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const applyCoupon = (coupon: Coupon) => {
    setAppliedCoupon(coupon);
    setCouponInput(coupon.code);
    setCouponFeedback({ type: 'success', text: `${coupon.code} applied!` });
    sessionStorage.setItem('aarah_applied_coupon', JSON.stringify(coupon));
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponFeedback(null);
    sessionStorage.removeItem('aarah_applied_coupon');
  };

  const { subtotal, discountAmount, shippingFee, finalTotal, couponWarning } = useMemo(() => {
    const currentSubtotal = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let currentDiscount = 0;
    let warning: string | null = null;
    let freeShipping = false;

    if (appliedCoupon) {
      const minRequired = appliedCoupon.minOrderValue || 0;
      
      const applicableSubtotal = appliedCoupon.appliesTo === 'specific_products'
        ? checkoutItems.filter(i => appliedCoupon.selectedProductIds?.includes(i.id)).reduce((sum, item) => sum + (item.price * item.quantity), 0)
        : currentSubtotal;
      
      if (currentSubtotal >= minRequired) {
        if (applicableSubtotal > 0) {
          if (appliedCoupon.type === 'PERCENTAGE') {
            currentDiscount = Math.round(applicableSubtotal * (appliedCoupon.value / 100));
            if (currentDiscount > applicableSubtotal) currentDiscount = applicableSubtotal;
          } else if (appliedCoupon.type === 'FIXED') {
            currentDiscount = Math.min(appliedCoupon.value, applicableSubtotal);
          } else if (appliedCoupon.type === 'FREE_SHIPPING') {
            freeShipping = true;
          }
        } else {
          warning = 'This coupon is not applicable to the products in your cart.';
        }
      } else {
        const shortfall = minRequired - currentSubtotal;
        warning = `Add ₹${shortfall.toLocaleString('en-IN')} more to unlock your ${appliedCoupon.code} discount.`;
      }
    }

    const subtotalAfterDiscount = currentSubtotal - currentDiscount;
    const currentShipping = freeShipping ? 0 : (subtotalAfterDiscount >= 2000 ? 0 : 99);
    const currentTotal = subtotalAfterDiscount + currentShipping;

    return {
      subtotal: currentSubtotal,
      discountAmount: currentDiscount,
      shippingFee: currentShipping,
      finalTotal: currentTotal,
      couponWarning: warning
    };
  }, [checkoutItems, appliedCoupon]);

  const handleSaveAddress = (addressData: AddressData) => {
    if (addressData.id) {
      editAddress(addressData.id, addressData as any);
    } else {
      const { id: _id, ...rest } = addressData as AddressData & { id?: number };
      addAddress(rest as any);
    }
    setIsAddressModalOpen(false);
  };

  const handleContinueToPayment = () => {
    if (!isAuthenticated) { setIsLoginOpen(true); return; }
    if (localAddresses.length === 0) { setIsAddressModalOpen(true); return; }
    if (!selectedAddress) {
      setAddressError('Please select a delivery address to continue.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    sessionStorage.setItem('aarah_checkout_address_id', String(selectedAddress));
    if (appliedCoupon?.code) {
      sessionStorage.setItem('aarah_checkout_coupon_code', appliedCoupon.code);
    } else {
      sessionStorage.removeItem('aarah_checkout_coupon_code');
    }

    setShowPolicy(true);
  };

  const handlePolicyAccept = () => {
    setShowPolicy(false);
    sessionStorage.setItem('aarah_checkout_summary', JSON.stringify({
      subtotal,
      discountAmount,
      shippingFee,
      finalTotal,
      appliedCoupon: appliedCoupon ? { code: appliedCoupon.code, type: appliedCoupon.type, value: appliedCoupon.value } : null
    }));
    router.push('/payment');
  };

  if (!mounted) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
    </div>
  );

  if (checkoutItems.length === 0) {
    return (
      <main className="min-h-screen bg-[#FAFAFA] pt-32 pb-20 flex flex-col items-center justify-center">
        <h1 className="font-serif text-3xl text-primary-dark mb-4 tracking-widest uppercase">Your Bag is Empty</h1>
        <Link href="/shop" className="bg-primary-dark text-white px-10 py-4 font-sans text-xs font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors">CONTINUE SHOPPING</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-32 pb-20">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-2xl tracking-[0.15em] uppercase text-primary-dark text-center mb-16">YOUR ORDER</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          <div className="lg:col-span-7 flex flex-col space-y-12">

            {/* Breadcrumb */}
            <nav className="flex items-center text-[11px] font-sans tracking-[0.1em] text-gray-500 mb-2">
              <button onClick={openCart} className="hover:text-primary-dark transition-colors cursor-pointer uppercase">Cart</button>
              <span className="mx-2">/</span>
              <span className="text-primary-dark uppercase font-bold">Shipping</span>
              <span className="mx-2">/</span>
              <span className="uppercase">Payment</span>
            </nav>

            {/* Address Selection */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-sans text-xs font-bold tracking-widest uppercase text-primary-dark mb-1">SHIPPING ADDRESS</h3>
                  <p className="font-sans text-[10px] tracking-widest text-gray-400 uppercase">Select where to deliver your Aarah pieces</p>
                </div>
                <button
                  onClick={() => { setEditingAddressData(null); setIsAddressModalOpen(true); }}
                  className="font-sans text-[10px] font-bold tracking-widest text-primary-dark flex items-center hover:text-gray-500 transition-colors uppercase"
                >
                  <Plus className="w-3 h-3 mr-1" /> ADD NEW
                </button>
              </div>

              {localAddresses.length === 0 ? (
                <button
                  onClick={() => setIsAddressModalOpen(true)}
                  className="w-full border-2 border-dashed border-gray-200 py-8 text-center font-sans text-xs text-gray-400 tracking-widest uppercase hover:border-gray-300 transition-colors"
                >
                  + Add Delivery Address
                </button>
              ) : (
                <div className="flex flex-col space-y-4">
                  {addressError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300" role="alert">
                      <span className="text-semantic-error text-sm font-medium">{addressError}</span>
                    </div>
                  )}
                  {localAddresses.map(addr => (
                    <button
                      type="button"
                      key={addr.id}
                      onClick={() => { setSelectedAddress(addr.id); setAddressError(null); }}
                      aria-pressed={selectedAddress === addr.id}
                      className={`relative w-full text-left p-5 border transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ${
                        selectedAddress === addr.id 
                          ? 'border-primary-dark bg-white shadow-sm' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {selectedAddress === addr.id && (
                        <div className="absolute top-4 right-12 w-5 h-5 bg-primary-dark rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <h4 className="font-sans text-[11px] font-bold text-primary-dark tracking-widest uppercase mb-2">{addr.name}</h4>
                      <p className="font-sans text-[11px] text-gray-600 leading-relaxed">{addr.address}, {addr.city}{addr.state ? `, ${addr.state}` : ''} — {addr.postalCode}</p>
                      <p className="font-sans text-[11px] text-gray-500 mt-1">{addr.phone}</p>
                      <span 
                        role="button"
                        tabIndex={0}
                        onClick={e => { e.stopPropagation(); setEditingAddressData(addr); setIsAddressModalOpen(true); }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setEditingAddressData(addr); setIsAddressModalOpen(true); }}}
                        className={`absolute bottom-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-primary-dark hover:bg-gray-50 transition-colors z-10 ${selectedAddress === addr.id ? 'block' : 'hidden group-hover:block'}`}
                        aria-label={`Edit address for ${addr.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Coupons */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-sans text-xs font-bold tracking-widest uppercase text-primary-dark flex items-center">
                  <Ticket className="w-4 h-4 mr-2" strokeWidth={1.5} /> AVAILABLE COUPONS
                </h3>
                {coupons.length > 0 && (
                  <button
                    onClick={() => setIsCouponsOpen(true)}
                    className="font-sans text-[10px] tracking-widest text-gray-400 underline underline-offset-4 hover:text-primary-dark transition-colors uppercase"
                  >
                    VIEW ALL OFFERS
                  </button>
                )}
              </div>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 px-4 py-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-semantic-success" />
                    <span className="font-sans text-[12px] font-bold text-semantic-success tracking-wider">
                      {appliedCoupon.code}{appliedCoupon.type === 'PERCENTAGE' && ` — ${appliedCoupon.value}% OFF`}
                    </span>
                  </div>
                  <button onClick={removeCoupon} className="font-sans text-[10px] text-gray-400 hover:text-red-500 tracking-widest uppercase underline">Remove</button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <input
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponFeedback(null); }}
                      onKeyDown={e => e.key === 'Enter' && validateCoupon(couponInput)}
                      placeholder="ENTER COUPON CODE"
                      className="flex-1 bg-white border border-gray-200 px-4 py-3.5 text-[11px] font-sans text-primary-dark uppercase tracking-widest outline-none focus:border-gray-400 transition-colors"
                    />
                    <button
                      onClick={() => validateCoupon(couponInput)}
                      disabled={isValidatingCoupon || !couponInput.trim()}
                      className="bg-[#191919] text-white px-6 py-3.5 font-sans text-[10px] font-bold tracking-widest uppercase hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                  {couponFeedback && (
                    <p className={`font-sans text-[10px] tracking-widest uppercase mb-3 ${couponFeedback.type === 'success' ? 'text-semantic-success' : 'text-semantic-error'}`}>
                      {couponFeedback.text}
                    </p>
                  )}
                </>
              )}

              {coupons.length > 0 && !appliedCoupon && (
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin snap-x snap-mandatory">
                  {coupons.map(coupon => (
                    <div
                      key={coupon.code}
                      className="flex-shrink-0 w-[260px] snap-center bg-white border border-gray-200 p-5 flex flex-col justify-between shadow-sm hover:border-gray-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col pr-2">
                          <span className="font-sans text-sm font-bold text-primary-dark mb-1 truncate">{coupon.code}</span>
                          <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-gray-500">{coupon.desc}</span>
                        </div>
                        <button
                          onClick={() => applyCoupon(coupon)}
                          className="font-sans text-[10px] font-bold tracking-widest uppercase pb-0.5 border-b-2 border-primary-dark text-primary-dark hover:text-gray-500 hover:border-gray-500 transition-all flex-shrink-0"
                        >
                          APPLY
                        </button>
                      </div>
                      {coupon.terms && (
                        <span className="font-sans text-[9px] text-gray-400 tracking-widest uppercase mt-1 line-clamp-1">* {coupon.terms}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={handleContinueToPayment}
                className="w-full sm:w-1/2 bg-[#191919] text-white py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors shadow-md"
              >
                CONTINUE TO PAYMENT
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-5 bg-[#F4F4F4] p-8 lg:p-10 border border-gray-100 shadow-sm sticky top-32">
            <h3 className="font-sans text-[11px] font-bold tracking-widest uppercase text-primary-dark mb-8">YOUR ORDER</h3>
            <div className="flex flex-col space-y-6 mb-8 max-h-[40vh] overflow-y-auto scrollbar-thin pt-4 pr-2 pb-4">
              {checkoutItems.map((item, index) => (
                <div key={`${item.id}-${item.size}-${index}`} className="flex space-x-4">
                  <div className="relative w-16 h-20 bg-gray-200 flex-shrink-0 border border-gray-200">
                    {item.image
                      ? <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                      : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-[10px] uppercase font-sans tracking-widest text-center leading-tight">No Img</div>
                    }
                    <div className="absolute -top-2 -right-2 bg-primary-dark text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{item.quantity}</div>
                  </div>
                  <div className="flex flex-col flex-1 justify-center">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-sans text-[10px] font-bold text-primary-dark pr-4 uppercase tracking-widest leading-relaxed line-clamp-1">{item.name}</h4>
                      <span className="font-sans text-[11px] font-bold text-primary-dark">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="font-sans text-[10px] text-gray-500 uppercase tracking-wider">SIZE: {item.size}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculation */}
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <div className="flex justify-between text-[11px] font-sans tracking-widest uppercase">
                <span className="text-gray-500">Subtotal ({checkoutItems.length} items)</span>
                <span className="font-bold text-primary-dark">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {appliedCoupon && (discountAmount > 0 || appliedCoupon.type === 'FREE_SHIPPING') && !couponWarning && (
                <div className="flex justify-between text-[11px] font-sans tracking-widest uppercase animate-in fade-in">
                  <span className="text-[#00a859] font-bold">
                    Discount ({appliedCoupon.code})
                    {appliedCoupon.type === 'PERCENTAGE' && <span className="text-[10px] ml-1 font-normal">({appliedCoupon.value}% OFF)</span>}
                    {appliedCoupon.type === 'FREE_SHIPPING' && <span className="text-[10px] ml-1 font-normal">(FREE SHIPPING)</span>}
                  </span>
                  <span className="font-bold text-[#00a859]">
                    {appliedCoupon.type === 'FREE_SHIPPING' ? 'APPLIED' : `-₹${discountAmount.toLocaleString('en-IN')}`}
                  </span>
                </div>
              )}

              {couponWarning && (
                <div className="bg-red-50 border border-red-100 p-3 rounded-sm animate-in fade-in">
                  <span className="font-sans text-[10px] text-semantic-error font-bold uppercase tracking-widest leading-relaxed">
                    {couponWarning}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-[11px] font-sans tracking-widest uppercase">
                <span className="text-gray-500">Standard Delivery</span>
                <span className="font-bold">
                  {shippingFee === 0 ? <span className="text-[#00a859]">FREE</span> : `₹${shippingFee}`}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 mt-6 pt-6 flex justify-between items-end">
              <div className="flex flex-col">
                <span className="font-sans text-sm font-bold tracking-widest uppercase text-primary-dark">Total</span>
                <span className="font-sans text-[9px] tracking-widest text-gray-400 uppercase">Including all taxes</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-sans text-[9px] text-gray-400 mb-1">INR</span>
                <span className="font-sans text-2xl font-bold text-primary-dark">₹{finalTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} onSave={handleSaveAddress} initialData={editingAddressData} />
      <CouponsModal
        isOpen={isCouponsOpen}
        onClose={() => setIsCouponsOpen(false)}
        onApply={c => { applyCoupon(c); setIsCouponsOpen(false); }}
        coupons={coupons}
      />
      <ExchangePolicyModal
        isOpen={showPolicy}
        onClose={() => setShowPolicy(false)}
        onAgreeToPay={handlePolicyAccept}
      />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onSuccess={() => handleContinueToPayment()} />
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"><Loader2 className="w-8 h-8 text-gray-300 animate-spin" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
