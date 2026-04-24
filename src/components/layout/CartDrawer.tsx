'use client';

import { useCart } from '@/context/CartContext';
import { X, Trash2, Plus, Minus, Check, ShoppingBag } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const PLACEHOLDER_IMAGE = '/assets/images/fabric-placeholder.jpg';

const CartItemImage = memo(function CartItemImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const normalizedSrc = useMemo(() => {
    const candidate = typeof src === 'string' ? src.trim() : '';
    return candidate || PLACEHOLDER_IMAGE;
  }, [src]);
  const [imgSrc, setImgSrc] = useState(normalizedSrc);

  useEffect(() => {
    setImgSrc(normalizedSrc);
  }, [normalizedSrc]);

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[CartItemImage] render', { normalizedSrc });
  }

  const handleError = () => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[CartItemImage] onError', { imgSrc });
    }
    if (imgSrc !== PLACEHOLDER_IMAGE) {
      setImgSrc(PLACEHOLDER_IMAGE);
    }
  };

  return <img src={imgSrc} alt={alt} className={className} onError={handleError} />;
});

export default function CartDrawer() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<number>(1);

  // Safely pull from context. If 'addresses' doesn't exist yet, default to empty array.
  const {
    isCartOpen, closeCart, cartItems = [], removeFromCart,
    updateQuantity, cartTotal = 0, cartCount = 0, addresses = []
  } = useCart();

  // 1. HYDRATION SAFETY: Prevent Next.js server/client mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-select the newest address
  useEffect(() => {
    if (addresses && addresses.length > 0) {
      setSelectedAddress(addresses[addresses.length - 1].id);
    }
  }, [addresses]);

  // Don't render anything until the client has mounted
  if (!mounted) return null;

  return (
    <>
      {/* Dark Overlay Background - Z-index cranked to 998 */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[998] transition-opacity duration-300 ${isCartOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={closeCart}
      />

      {/* Slide-out Drawer Panel - Z-index cranked to 999 */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white z-[999] shadow-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-[#FAFAFA]">
          <h2 className="font-serif text-2xl text-primary-dark tracking-tight">Your Cart</h2>
          <button onClick={closeCart} className="p-2 hover:bg-gray-200 rounded-full transition-colors bg-white shadow-sm border border-gray-100" aria-label="Close Cart">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col space-y-8">

          {/* Cart Items List */}
          <div className="flex flex-col space-y-6">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-2">
                  <ShoppingBag className="w-8 h-8" strokeWidth={1} />
                </div>
                <h3 className="font-serif text-xl text-primary-dark">Your bag is empty</h3>
                <p className="font-sans text-[10px] tracking-widest uppercase text-gray-400">
                  Looks like you haven't added any items yet.
                </p>
                <button onClick={closeCart} className="mt-4 border-b border-primary-dark pb-1 font-sans text-[10px] font-bold tracking-[0.2em] uppercase text-primary-dark hover:text-gray-500 transition-colors">
                  Continue Shopping
                </button>
              </div>
            ) : (
              cartItems.map((item: any, index: number) => (
                <div key={`${item.id}-${item.size}-${index}`} className="flex space-x-4 relative group">
                  {/* Image */}
                  <div className="w-20 h-28 bg-[#F5F5F5] flex-shrink-0 rounded-sm overflow-hidden">
                    <CartItemImage
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex flex-col flex-1 py-1">
                    <h4 className="font-sans text-[11px] font-bold text-primary-dark pr-6 mb-1 uppercase tracking-widest leading-relaxed line-clamp-2">{item.name}</h4>
                    {item.size && (
                      <p className="font-sans text-[10px] text-gray-500 mb-2 uppercase tracking-wider">SIZE: {item.size}</p>
                    )}

                    <div className="flex items-center space-x-2 font-sans text-xs">
                      {item.originalPrice && (
                        <span className="text-gray-400 line-through">₹{item.originalPrice.toLocaleString('en-IN')}</span>
                      )}
                      <span className="font-bold text-primary-dark text-[12px]">₹{item.price.toLocaleString('en-IN')}</span>
                    </div>
                    {item.discountText && (
                      <span className="font-sans text-[10px] text-red-500 mt-0.5">{item.discountText}</span>
                    )}

                    {/* Quantity Controls - FIXED HERE */}
                    <div className="mt-auto flex items-center justify-between w-24 pt-2">
                      <div className="flex items-center border border-gray-200 w-full justify-between rounded-sm">
                        {/* Sends -1 to context */}
                        <button onClick={() => updateQuantity(item.id, item.size, -1)} disabled={item.quantity <= 1} className="px-2 py-1.5 hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-30">
                          <Minus className="w-3 h-3" />
                        </button>

                        <span className="px-1 py-1 font-sans text-[11px] text-primary-dark font-bold">{item.quantity}</span>

                        {/* Sends +1 to context */}
                        <button onClick={() => updateQuantity(item.id, item.size, 1)} className="px-2 py-1.5 hover:bg-gray-50 text-gray-500 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => removeFromCart(item.id, item.size)}
                    className="absolute top-1 right-0 p-1 text-gray-300 hover:text-red-500 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Shipping Address Section (Only visible if cart has items) */}
          {cartItems.length > 0 && addresses && addresses.length > 0 && (
            <div className="border-t border-gray-100 pt-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-sans text-xs font-bold tracking-widest uppercase text-primary-dark">SHIPPING ADDRESS</h3>
                  <p className="font-sans text-[9px] tracking-widest text-gray-400 mt-1 uppercase">Select where to deliver</p>
                </div>
                <Link
                  href="/checkout/add-address"
                  onClick={closeCart}
                  className="font-sans text-[10px] font-bold tracking-widest text-primary-dark flex items-center hover:text-gray-500 transition-colors uppercase"
                >
                  <Plus className="w-3 h-3 mr-1" /> ADD NEW
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr: any) => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedAddress(addr.id)}
                    className={`border p-4 cursor-pointer relative transition-all ${selectedAddress === addr.id ? 'border-primary-dark shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-3 rounded-full border border-gray-300 flex items-center justify-center">
                        {selectedAddress === addr.id && <div className="w-1.5 h-1.5 rounded-full bg-primary-dark" />}
                      </div>
                      <span className="font-sans text-[10px] font-bold text-primary-dark uppercase tracking-wider">{addr.name}</span>
                    </div>
                    <p className="font-sans text-[10px] text-gray-500 leading-relaxed uppercase">{addr.address},<br />{addr.city}</p>

                    {selectedAddress === addr.id && (
                      <div className="absolute top-3 right-3 bg-primary-dark rounded-full p-0.5 text-white">
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Checkout Button */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-100 p-6 bg-white z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center mb-6">
              <span className="font-sans text-[11px] font-bold tracking-widest uppercase text-gray-500">Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
              <span className="font-serif text-2xl text-primary-dark font-bold">₹{cartTotal.toLocaleString('en-IN')}</span>
            </div>

            <button
              onClick={() => {
                closeCart();
                router.push('/checkout');
              }}
              className="w-full bg-[#191919] text-white py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors flex items-center justify-center shadow-md mb-3"
            >
              PROCEED TO CHECKOUT
            </button>

            <p className="font-sans text-[9px] text-center text-gray-400 tracking-widest uppercase">
              Shipping & taxes calculated at checkout.
            </p>
          </div>
        )}
      </div>
    </>
  );
}