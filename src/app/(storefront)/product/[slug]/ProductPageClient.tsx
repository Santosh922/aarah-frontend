'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StarRating from '@/components/ui/StarRating';
import MaternityFavoritesCarousel from '@/components/home/MaternityFavoritesCarousel';
import ProductReviews from '@/components/ui/ProductReviews';
import ReviewForm from '@/components/ui/ReviewForm';
import CouponsModal from '@/components/modals/CouponsModal';

import {
  ChevronDown, Star, X, Truck, Info, RefreshCw,
  ArrowRightLeft, MapPin, Send, Ticket, Clock, Video, ShieldAlert, CheckCircle2,
  Recycle, FlaskConical, Loader2, XCircle, MapPinOff, Heart,
} from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import type { Product, Variant } from '@/components/ui/ProductCard';
import type { Coupon } from '@/types';

export default function ProductPageClient({
  product,
  relatedProducts,
  initialCoupons,
}: {
  product: Product;
  relatedProducts?: Product[];
  initialCoupons?: Coupon[];
}) {
  const router = useRouter();
  const { addToCart, favorites, toggleFavorite, cartItems } = useCart();

  const apiUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const productReviews = (product as any).reviews ?? [];
  const totalReviews = productReviews.length;
  let totalRating = 0;
  const ratingCounts = [0, 0, 0, 0, 0];
  productReviews.forEach((r: any) => { ratingCounts[r.rating - 1]++; totalRating += r.rating; });
  const averageRating = totalReviews > 0 ? (totalRating / totalReviews) : 0;
  const distribution = [5, 4, 3, 2, 1].map(star => ({ rating: star, count: String(ratingCounts[star - 1]) }));
  const initialStats = { average: averageRating, total: totalReviews, distribution };
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons || []);

  const safeImages = product.images && product.images.length > 0 
    ? product.images 
    : [{ url: '/assets/images/fabric-placeholder.jpg', isPrimary: true }];
    
  const primaryImage = safeImages.find((i: any) => i.isPrimary)?.url || safeImages[0].url;

  const [mainImage, setMainImage] = useState<string>(primaryImage);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [sizeErrorMessage, setSizeErrorMessage] = useState<string | null>(null);

  const [isAddedToBag, setIsAddedToBag] = useState(false);

  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'loading' | 'success' | 'invalid' | 'unserviceable'>('idle');
  const [deliveryCity, setDeliveryCity] = useState('');

  const [isCouponsOpen, setIsCouponsOpen] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isFavorited = favorites.includes(product.id);
  const productCountInCart = cartItems
    .filter((item: any) => item.id === product.id)
    .reduce((sum: number, item: any) => sum + item.quantity, 0);

  const displayImages = safeImages.map(img => img.url);
  const discountPct = product.mrp && product.mrp > product.price
    ? Math.round((1 - product.price / product.mrp) * 100)
    : 0;
    
  const allSizes = Array.from(new Set(product.variants?.map(v => v.size) ?? ['XS', 'S', 'M', 'L', 'XL']));
  const availableSizes = product.variants?.filter(v => v.stock > 0).map(v => v.size) ?? [];

  const exchangePolicyText = [
    { icon: <Clock className="w-5 h-5 text-primary-dark" strokeWidth={1.5} />, title: '48-HOUR WINDOW', desc: 'EXCHANGE REQUESTS MUST BE INITIATED WITHIN 48 HOURS (2 DAYS) OF RECEIVING YOUR DELIVERY.' },
    { icon: <Video className="w-5 h-5 text-primary-dark" strokeWidth={1.5} />, title: 'UNBOXING VIDEO', desc: 'A MANDATORY OPENING VIDEO IS REQUIRED FOR ALL EXCHANGE CLAIMS TO VERIFY THE CONDITION OF THE GARMENT.' },
    { icon: <RefreshCw className="w-5 h-5 text-primary-dark" strokeWidth={1.5} />, title: 'SIZE & DEFECTS', desc: 'EXCHANGES ARE STRICTLY PERMITTED FOR SIZE ADJUSTMENTS OR MANUFACTURING DEFECTS ONLY.' },
    { icon: <ShieldAlert className="w-5 h-5 text-primary-dark" strokeWidth={1.5} />, title: 'NO REFUNDS', desc: 'AARAH MAINTAINS A STRICT NO-REFUND POLICY. WE OFFER EXCHANGES TO ENSURE YOU FIND YOUR PERFECT FIT.' },
  ];

  const sizeGuideData = [
    { size: 'XS', bust: '32-33"', waist: '24-25"', hips: '34-35"' },
    { size: 'S',  bust: '34-35"', waist: '26-27"', hips: '36-37"' },
    { size: 'M',  bust: '36-37"', waist: '28-29"', hips: '38-39"' },
    { size: 'L',  bust: '38-40"', waist: '30-32"', hips: '40-42"' },
    { size: 'XL', bust: '41-43"', waist: '33-35"', hips: '43-45"' },
    { size: 'XXL',bust: '44-46"', waist: '36-38"', hips: '46-48"' },
  ];

  const handleSizeSelect = (size: string) => {
    const variant = product.variants?.find((v: any) => v.size === size);
    if (variant && variant.stock > 0) {
      setSelectedSize(size);
      setSelectedVariant(variant);
      setSizeErrorMessage(null);
    } else {
      setSizeErrorMessage(`${size} is currently out of stock.`);
      setTimeout(() => setSizeErrorMessage(null), 3000);
    }
  };

  const handleAddToCart = () => {
    if (!selectedSize || !selectedVariant) {
      setSizeErrorMessage('Please select a size first.');
      setTimeout(() => setSizeErrorMessage(null), 3000);
      return;
    }
    addToCart({ id: product.id, variantId: selectedVariant.id, name: product.name, size: selectedSize, price: product.price, image: mainImage, quantity: 1 }, true);
    setIsAddedToBag(true);
    setTimeout(() => setIsAddedToBag(false), 3000);
  };

  const executeBuyNow = () => {
    if (!selectedSize || !selectedVariant) return;
    const buyNowItem = { id: product.id, variantId: selectedVariant.id, name: product.name, size: selectedSize, price: product.price, image: mainImage, quantity: 1 };
    sessionStorage.setItem('aarah_buy_now', JSON.stringify([buyNowItem]));
    router.push('/checkout?mode=buynow');
  };

  const handleBuyNowClick = () => {
    if (!selectedSize) { setSizeErrorMessage('Please select a size first.'); setTimeout(() => setSizeErrorMessage(null), 3000); return; }
    executeBuyNow();
  };

  const handlePincodeCheck = async () => {
    const cleanPin = pincode.replace(/\D/g, '');
    if (cleanPin.length !== 6) { setPincodeStatus('invalid'); return; }
    setPincodeStatus('loading');
    try {
      const res = await fetch(`${apiUrl}/api/storefront/pincode?pin=${cleanPin}`);
      const data = await res.json();
      if (data?.Status === 'Success' && data?.PostOffice?.[0]?.District) {
        setDeliveryCity(data.PostOffice[0].District);
        setPincodeStatus(cleanPin === '999999' ? 'unserviceable' : 'success');
      } else if (data?.error) {
        setPincodeStatus('invalid');
      } else {
        setPincodeStatus('invalid');
      }
    } catch { setPincodeStatus('invalid'); }
  };

  const handleManualPromoApply = async () => {
    if (!promoInput.trim()) return;
    try {
      const res = await fetch(`${apiUrl}/api/storefront/discounts/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput, cartTotal: product.price }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({ code: data.code, type: data.type, value: data.value, desc: data.desc, terms: data.terms });
        setPromoFeedback({ type: 'success', text: 'Coupon applied!' });
        setTimeout(() => setPromoFeedback(null), 4000);
      } else {
        setPromoFeedback({ type: 'error', text: data.error || 'Invalid promo code.' });
      }
    } catch {
      setPromoFeedback({ type: 'error', text: 'Failed to validate coupon.' });
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-48 pb-20 relative">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* LEFT: Image Gallery */}
          <div className="flex flex-col lg:sticky lg:top-32">
            <div className="relative w-full aspect-[4/5] bg-gray-100 overflow-hidden border border-gray-100 shadow-sm">
              {discountPct > 0 && (
                <span className="absolute top-4 left-4 bg-white text-brand-discount font-bold tracking-widest text-[10px] px-3 py-1 border border-brand-discount/20 uppercase z-10">{discountPct}% OFF</span>
              )}
              {mainImage && <Image src={mainImage} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />}
            </div>
            <div className="flex space-x-2 mt-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {displayImages.map((img: string, index: number) => (
                <div key={index} className={`relative w-[70px] h-[70px] flex-shrink-0 cursor-pointer transition-all ${mainImage === img ? 'border-2 border-primary-dark opacity-100' : 'border border-gray-100 opacity-60 hover:opacity-100'}`} onClick={() => setMainImage(img)}>
                  <Image src={img} alt={`thumb-${index}`} fill className="object-cover" sizes="70px" />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Product Details */}
          <div className="flex flex-col text-left pt-2">
            <span className="font-sans text-[10px] text-gray-400 tracking-[0.2em] uppercase mb-2">Aarah Maternity</span>
            <h1 className="font-serif text-3xl md:text-4xl text-primary-dark mb-4">{product.name}</h1>

            <div className="flex items-center space-x-4 mb-4">
              <span className="font-sans text-2xl font-bold text-primary-dark">₹{product.price.toLocaleString('en-IN')}</span>
              {product.mrp && product.mrp > product.price && <span className="font-sans text-sm text-gray-400 line-through">₹{product.mrp.toLocaleString('en-IN')}</span>}
            </div>

            {(product as any).fabric && (
              <div className="flex items-center gap-2 mb-4">
                <span className="font-sans text-[10px] text-gray-400 tracking-widest uppercase">Fabric:</span>
                <span className="font-sans text-[11px] font-semibold text-primary-dark tracking-wide">{((product as any).fabric)}</span>
              </div>
            )}

            {/* Size Selector */}
            <div className="mb-6 mt-6">
              <div className="flex justify-between items-center mb-3">
                <span className="font-sans text-[11px] font-bold tracking-widest uppercase text-primary-dark">Select Size</span>
                <button onClick={() => setIsSizeGuideOpen(true)} className="font-sans text-[10px] text-gray-400 underline underline-offset-4 hover:text-primary-dark transition-colors">Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-3 relative pb-6">
                {allSizes.map((size: any) => {
                  const isAvailable = availableSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => handleSizeSelect(size)}
                      disabled={!isAvailable}
                      className={`w-12 h-10 flex items-center justify-center font-sans text-xs border transition-all relative
                        ${!isAvailable ? 'border-gray-100 text-gray-300 bg-[#F9F9F9] cursor-not-allowed' : selectedSize === size ? 'border-primary-dark bg-primary-dark text-white font-bold' : 'border-gray-300 text-gray-600 hover:border-gray-500 bg-white'}`}
                    >
                      <span>{size}</span>
                      {!isAvailable && (
                        <div className="absolute inset-0 flex items-center justify-center"><div className="w-[120%] h-[1px] bg-gray-300 rotate-[-35deg]" /></div>
                      )}
                    </button>
                  );
                })}
                {sizeErrorMessage && <span className="absolute bottom-0 left-0 text-[9px] text-semantic-error tracking-widest uppercase">{sizeErrorMessage}</span>}
              </div>
            </div>

            {/* Add to Cart / Buy Now */}
            <div className="flex flex-col space-y-3 mb-8">
              <div className="flex items-stretch space-x-3 h-[52px]">
                <button
                  onClick={handleAddToCart}
                  disabled={isAddedToBag}
                  className={`flex-1 font-sans text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-300 shadow-sm flex items-center justify-center space-x-2 relative overflow-hidden
                    ${isAddedToBag ? 'bg-[#00a859] border border-[#00a859] text-white cursor-default' : 'bg-white border border-[#191919] text-[#191919] hover:bg-gray-50'}`}
                >
                  {isAddedToBag ? (
                    <><CheckCircle2 className="w-4 h-4 animate-in zoom-in" strokeWidth={2.5} /><span className="animate-in fade-in">ADDED TO BAG</span></>
                  ) : (
                    <><span>ADD TO BAG</span>
                      {productCountInCart > 0 && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center bg-[#191919] text-white text-[10px] font-bold w-6 h-6 rounded-full shadow-sm animate-in zoom-in duration-300">
                          {productCountInCart}
                        </div>
                      )}
                    </>
                  )}
                </button>
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className={`w-[52px] flex-shrink-0 flex items-center justify-center border transition-all shadow-sm ${isFavorited ? 'border-red-100 bg-red-50 hover:bg-red-100' : 'border-[#191919] bg-white hover:bg-gray-50'}`}
                  aria-label="Toggle Favourite"
                >
                  <Heart className={`w-5 h-5 transition-colors ${isFavorited ? 'fill-semantic-error text-semantic-error' : 'text-[#191919]'}`} strokeWidth={1.5} />
                </button>
              </div>
              <button
                onClick={handleBuyNowClick}
                className="w-full h-[52px] bg-[#191919] text-white font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors shadow-sm"
              >
                BUY IT NOW
              </button>
            </div>

            {/* Delivery Info */}
            <div className="flex border-t border-b border-gray-100 py-6 mb-8">
              <div className="flex-1 pr-4 border-r border-gray-100">
                <div className="flex items-center space-x-2.5 mb-2.5"><Truck className="w-4 h-4 text-primary-dark" strokeWidth={1.5} /><span className="font-bold text-[10px] tracking-widest uppercase text-primary-dark">Standard Delivery</span></div>
                <span className="text-[10px] text-gray-600 tracking-widest uppercase block mb-3.5">2 TO 5 WORKING DAYS</span>
                <div className="flex items-center space-x-2 text-gray-400"><Info className="w-3.5 h-3.5" strokeWidth={1.5} /><span className="text-[10px] uppercase tracking-widest">No Refunds</span></div>
              </div>
              <div className="flex-1 pl-6">
                <div className="flex items-center space-x-2.5 mb-2.5"><RefreshCw className="w-4 h-4 text-primary-dark" strokeWidth={1.5} /><span className="font-bold text-[10px] tracking-widest uppercase text-primary-dark">48HR EXCHANGE WINDOW</span></div>
                <span className="text-[10px] text-gray-600 tracking-widest uppercase block mb-3.5">INITIATE VIA PORTAL</span>
                <div className="flex items-center space-x-2 text-gray-400"><ArrowRightLeft className="w-3.5 h-3.5" strokeWidth={1.5} /><span className="text-[10px] uppercase tracking-widest">Exchange Only</span></div>
              </div>
            </div>

            {/* Pincode Check */}
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <MapPin className="w-4 h-4 text-primary-dark" strokeWidth={1.5} />
                <span className="font-bold text-[10px] tracking-widest uppercase text-primary-dark">Check Delivery & Availability</span>
              </div>
              <div className="flex h-12">
                <div className="relative flex-1 bg-[#F9F9F9] border border-gray-100 flex items-center transition-colors">
                  <input
                    type="text" maxLength={6} placeholder="ENTER 6-DIGIT PINCODE"
                    value={pincode}
                    onChange={e => { setPincode(e.target.value.replace(/\D/g, '')); setPincodeStatus('idle'); }}
                    className="w-full bg-transparent px-4 outline-none text-[10px] tracking-widest uppercase font-sans placeholder-gray-400"
                  />
                  {pincodeStatus === 'loading'
                    ? <Loader2 className="w-3.5 h-3.5 text-gray-400 absolute right-4 animate-spin" strokeWidth={1.5} />
                    : <Send className="w-3.5 h-3.5 text-gray-400 absolute right-4" strokeWidth={1.5} />
                  }
                </div>
                <button
                  onClick={handlePincodeCheck}
                  disabled={pincodeStatus === 'loading' || pincode.length < 6}
                  className={`bg-[#191919] text-white px-8 text-[10px] font-bold tracking-widest uppercase transition-colors ${pincodeStatus === 'loading' || pincode.length < 6 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'hover:bg-black'}`}
                >
                  {pincodeStatus === 'loading' ? 'CHECKING' : 'CHECK'}
                </button>
              </div>
              <div className="mt-3 h-[20px]">
                {pincodeStatus === 'invalid' && <span className="text-[9px] text-semantic-error tracking-widest uppercase font-bold flex items-center animate-in fade-in"><XCircle className="w-3 h-3 mr-1" /> Invalid Pincode. Please try again.</span>}
                {pincodeStatus === 'unserviceable' && <span className="text-[9px] text-orange-500 tracking-widest uppercase font-bold flex items-center animate-in fade-in"><MapPinOff className="w-3 h-3 mr-1" /> Sorry, no service available for this location.</span>}
                {pincodeStatus === 'success' && <span className="text-[9px] text-semantic-success tracking-widest uppercase font-bold flex items-center animate-in fade-in"><CheckCircle2 className="w-3 h-3 mr-1" /> Deliverable to {deliveryCity}. Usually arrives in 2–5 days.</span>}
              </div>
            </div>

            {/* Coupon */}
            <div className="mb-10 pb-10 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2"><Ticket className="w-4 h-4 text-primary-dark" strokeWidth={1.5} /><span className="font-bold text-[10px] tracking-widest uppercase text-primary-dark">Apply Coupon</span></div>
                <button onClick={() => setIsCouponsOpen(true)} className="text-[9px] tracking-widest uppercase text-gray-400 hover:text-primary-dark transition-colors font-bold">View Coupons</button>
              </div>
              <div className="flex h-12">
                <input
                  type="text" placeholder="PROMO CODE" value={promoInput}
                  onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoFeedback(null); }}
                  className="flex-1 bg-[#F9F9F9] border border-gray-100 px-4 outline-none text-[10px] tracking-widest uppercase font-sans placeholder-gray-400"
                />
                <button onClick={handleManualPromoApply} className="bg-white text-primary-dark border border-gray-200 px-8 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-colors ml-2">Apply</button>
              </div>
              {promoFeedback && (
                <div className={`mt-2 text-[9px] font-bold tracking-widest uppercase ${promoFeedback.type === 'success' ? 'text-semantic-success' : 'text-semantic-error'}`}>{promoFeedback.text}</div>
              )}
              {appliedCoupon && (
                <div className="mt-4 p-4 bg-[#F6FBF7] border border-[#E8F3EA] flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-semantic-success" strokeWidth={2} />
                    <div className="flex flex-col">
                      <span className="font-sans text-[11px] font-bold text-primary-dark tracking-widest uppercase">{appliedCoupon.code}</span>
                      <span className="font-sans text-[9px] text-semantic-success tracking-widest uppercase font-bold">{appliedCoupon.desc}</span>
                      {appliedCoupon.terms && <span className="font-sans text-[8px] text-gray-500 uppercase tracking-widest mt-1">* {appliedCoupon.terms}</span>}
                    </div>
                  </div>
                  <button onClick={() => { setAppliedCoupon(null); setPromoFeedback(null); setPromoInput(''); }} className="text-[9px] text-gray-400 hover:text-semantic-error tracking-widest uppercase font-bold transition-colors">Remove</button>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="pt-2">
              <h4 className="font-sans text-[15px] font-normal text-primary-dark mb-4">Effortless style for every stage.</h4>
              <p className="font-sans text-[13px] text-gray-500 leading-relaxed tracking-wide mb-8">
                {product.description ?? product.subtitle ?? 'The Aarah Maternity Kurti combines comfort and style. Thoughtfully designed with soft, breathable fabric and a flattering silhouette to accommodate your changing shape.'}
              </p>
              <div className="border-t border-gray-200 py-6 flex items-start">
                <div className="w-1/3 font-sans text-[13px] text-primary-dark">Fit</div>
                <div className="w-2/3 font-sans text-[13px] text-primary-dark flex flex-col space-y-1">
                  <span>Questions about fit?</span>
                  <Link href="/contact" className="text-left hover:text-gray-500 transition-colors w-fit">Contact Us</Link>
                  <button onClick={() => setIsSizeGuideOpen(true)} className="text-left hover:text-gray-500 transition-colors w-fit">Size Guide</button>
                </div>
              </div>
              <div className="border-t border-gray-200 py-6">
                <div className="font-sans text-[13px] text-primary-dark mb-6">Sustainability</div>
                <div className="flex items-center space-x-10 sm:space-x-14">
                  <div className="flex items-center space-x-3"><Recycle className="w-7 h-7 text-primary-dark" strokeWidth={1.5} /><span className="font-sans text-[10px] font-bold tracking-[0.15em] uppercase text-primary-dark max-w-[100px] leading-tight">RENEWED MATERIALS</span></div>
                  <div className="flex items-center space-x-3"><FlaskConical className="w-7 h-7 text-primary-dark" strokeWidth={1.5} /><span className="font-sans text-[10px] font-bold tracking-[0.15em] uppercase text-primary-dark max-w-[100px] leading-tight">CLEANER CHEMISTRY</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exchange Policy */}
        <div className="mt-32 py-20 text-center border-t border-b border-gray-100 bg-white shadow-inner-sm">
          <span className="font-sans text-[9px] tracking-[0.25em] text-gray-400 uppercase block mb-4">THE AARAH COMMITMENT</span>
          <h3 className="font-serif text-3xl md:text-4xl text-primary-dark mb-4">Our Exchange Policy</h3>
          <p className="font-sans text-[10px] text-gray-500 tracking-[0.15em] uppercase max-w-2xl mx-auto mb-20 leading-relaxed px-4">To maintain our high standards of quality and service, we adhere to a refined exchange process.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto px-4 mb-16">
            {exchangePolicyText.map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center px-2">
                <div className="w-16 h-16 rounded-full border border-gray-100 flex items-center justify-center mb-6 bg-white shadow-inner-xs">{item.icon}</div>
                <h4 className="font-sans text-[11px] font-bold tracking-[0.15em] uppercase text-primary-dark mb-4 leading-relaxed">{item.title}</h4>
                <p className="font-sans text-[10px] text-gray-500 leading-relaxed tracking-wider uppercase px-1">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="inline-flex items-center justify-center space-x-2 bg-[#F6FBF7] px-6 py-3 rounded-full border border-[#E8F3EA] shadow-inner-xs">
            <CheckCircle2 className="w-4 h-4 text-green-600" strokeWidth={2} />
            <span className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase text-primary-dark">QUALITY ASSURED • PREMIUM MATERNITY WEAR</span>
          </div>

          <div className="mt-10">
            <Link href="/terms" className="font-sans text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 border-b border-gray-400 pb-0.5 hover:text-black hover:border-black transition-colors">
              Read Full Terms & Conditions
            </Link>
          </div>
        </div>

        <div className="mt-32 pt-16 border-t border-gray-100">
          <MaternityFavoritesCarousel initialProducts={relatedProducts || []} />
        </div>

        {/* Reviews Section */}
        <div className="mt-32 py-20 bg-[#f8f8f8] border border-gray-100 shadow-inner-sm">
          <div className="max-w-6xl mx-auto px-4 md:px-10">
            <h3 className="font-serif text-3xl text-primary-dark text-center mb-12">Customer Reviews</h3>
            <ProductReviews productId={product.id} productName={product.name} initialReviews={productReviews as any} initialStats={initialStats} />
            
            {/* Write Review Section */}
            <div className="mt-16 pt-12 border-t border-gray-200">
              <h4 className="font-serif text-2xl text-primary-dark text-center mb-8">Share Your Experience</h4>
              <div className="max-w-2xl mx-auto">
                <ReviewForm productId={product.id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSizeGuideOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl shadow-2xl flex flex-col z-10 p-8 md:p-12 max-h-[90vh] overflow-y-auto border border-gray-100">
            <button onClick={() => setIsSizeGuideOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            <h2 className="font-serif text-2xl text-primary-dark mb-4">Size Guide</h2>
            <p className="font-sans text-[12px] text-gray-600 mb-8 leading-relaxed max-w-lg">Our Maternity Kurti is designed to grow with you. We recommend choosing your pre-pregnancy size. All measurements are in inches.</p>
            <div className="overflow-x-auto mb-10 pb-3">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead><tr className="border-b-2 border-primary-dark text-gray-500 font-bold tracking-widest uppercase"><th className="py-4 font-bold pr-4">SIZE</th><th className="py-4 font-bold pr-4">BUST</th><th className="py-4 font-bold pr-4">WAIST</th><th className="py-4 font-bold">HIPS</th></tr></thead>
                <tbody>{sizeGuideData.map(row => (<tr key={row.size} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"><td className="py-4 font-bold text-primary-dark pr-4">{row.size}</td><td className="py-4 text-gray-600 pr-4">{row.bust}</td><td className="py-4 text-gray-600 pr-4">{row.waist}</td><td className="py-4 text-gray-600">{row.hips}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <CouponsModal
        isOpen={isCouponsOpen}
        onClose={() => setIsCouponsOpen(false)}
        onApply={(coupon) => {
          setAppliedCoupon(coupon);
          setPromoInput(coupon.code);
          setPromoFeedback({ type: 'success', text: 'Coupon applied! Final discount calculated at checkout.' });
          setIsCouponsOpen(false);
          setTimeout(() => setPromoFeedback(null), 4000);
        }}
        coupons={coupons}
      />
    </main>
  );
}
