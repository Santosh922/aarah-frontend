'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { X, Trash2, MapPin, CheckCircle2, Plus, Minus } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Address {
  id: string | number;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  state?: string;
  phone: string;
  isDefault?: boolean;
}

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
    console.debug('[CartModalImage] render', { normalizedSrc });
  }

  const handleError = () => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[CartModalImage] onError', { imgSrc });
    }
    if (imgSrc !== PLACEHOLDER_IMAGE) {
      setImgSrc(PLACEHOLDER_IMAGE);
    }
  };

  return <img src={imgSrc} alt={alt} className={className} onError={handleError} />;
});

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cartItems, updateQuantity, removeFromCart, addresses: localAddresses } = useCart();
  const { currentUser, isAuthenticated } = useAuth();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (!isOpen) return;

    const fetchAddresses = async () => {
      setIsLoadingAddresses(true);
      try {
        let fetchedFromDB = false;

        if (isAuthenticated && currentUser?.customerId) {
          const res = await fetch(`${API_URL}/api/user/addresses?customerId=${currentUser.customerId}`);
          if (res.ok) {
            const dbAddresses = await res.json();
            if (dbAddresses && dbAddresses.length > 0) {
              const formatted = dbAddresses.map((addr: any) => ({
                id: addr.id.toString(),
                name: addr.name,
                address: addr.address,
                city: addr.city,
                postalCode: addr.postalCode,
                state: addr.state,
                phone: addr.phone,
                isDefault: addr.isDefault
              }));
              setAddresses(formatted);
              const defaultAddr = formatted.find((a: Address) => a.isDefault) || formatted[0];
              setSelectedAddressId(defaultAddr.id);
              fetchedFromDB = true;
            }
          }
        }

        if (!fetchedFromDB && localAddresses && localAddresses.length > 0) {
          setAddresses(localAddresses);
          setSelectedAddressId(localAddresses[0].id.toString());
        }
      } catch (error) {
        console.error("Failed to load addresses", error);
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, [isOpen, isAuthenticated, currentUser, localAddresses]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] transition-opacity"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white z-[210] shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0">
        
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-50">
          <h2 className="font-sans text-3xl font-light text-[#191919]">Your Cart</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-black transition-colors">
            <X className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col">
          
          {cartItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <p className="font-sans text-sm text-gray-500 uppercase tracking-widest mb-6">Your cart is empty.</p>
              <Link href="/shop" onClick={onClose} className="bg-[#191919] text-white px-8 py-4 text-[11px] font-bold tracking-widest uppercase hover:bg-black">
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="flex flex-col px-6 py-6 space-y-8">
              {cartItems.map((item) => {
                const productHref = `/product/${item.productSlug || item.slug || item.id}`;
                const discountPct = item.originalPrice && item.originalPrice > item.price 
                  ? Math.round((1 - item.price / item.originalPrice) * 100) 
                  : 0;

                return (
                  <div key={`${item.id}-${item.size}`} className="flex gap-5 relative group">
                    
                    <Link href={productHref} onClick={onClose} className="shrink-0 w-[90px] h-[120px] bg-[#F5F5F5] overflow-hidden">
                      <CartItemImage
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>

                    <div className="flex flex-col flex-1 pt-1">
                      
                      <div className="flex justify-between items-start pr-2">
                        <Link href={productHref} onClick={onClose} className="font-sans text-[15px] font-normal text-[#191919] leading-snug max-w-[85%]">
                          {item.name}
                        </Link>
                        <button 
                          onClick={() => removeFromCart(item.id, item.size)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1 -mt-1 -mr-2"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>

                      <p className="font-sans text-[11px] text-gray-500 uppercase tracking-widest mt-1 mb-2">
                        SIZE : {item.size}
                      </p>

                      <div className="flex items-end justify-between mt-auto">
                        
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-1.5 font-sans text-[13px]">
                            {item.originalPrice && item.originalPrice > item.price && (
                              <span className="text-gray-400 line-through">
                                ₹{item.originalPrice.toLocaleString('en-IN')}
                              </span>
                            )}
                            <span className="text-[#191919]">
                              ₹{item.price.toLocaleString('en-IN')}
                            </span>
                          </div>
                          {discountPct > 0 && (
                            <span className="font-sans text-[12px] text-brand-discount mt-0.5">
                              ({discountPct}% Off)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center border border-gray-200 h-9 px-1">
                          <button 
                            onClick={() => updateQuantity(item.id, item.size, -1)}
                            aria-label="Decrease quantity"
                            className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-inset"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-sans text-[13px] text-[#191919]" aria-live="polite" aria-atomic="true">
                            {item.quantity}
                          </span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.size, 1)}
                            aria-label="Increase quantity"
                            className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-inset"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {cartItems.length > 0 && !isLoadingAddresses && addresses.length > 0 && (
            <div className="mt-auto px-6 py-8 border-t border-gray-50">
              
              <div className="flex items-end justify-between mb-6">
                <div className="flex flex-col">
                  <h3 className="font-sans text-[13px] font-bold tracking-[0.2em] uppercase text-[#191919] mb-1">
                    Shipping Address
                  </h3>
                  <p className="font-sans text-[9px] text-gray-400 tracking-widest uppercase">
                    Select where to deliver your Aarah pieces
                  </p>
                </div>
                <Link href="/account" onClick={onClose} className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#191919] flex items-center hover:text-gray-500 transition-colors">
                  <Plus className="w-3 h-3 mr-1" strokeWidth={2} /> Add New
                </Link>
              </div>

              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x snap-mandatory">
                {addresses.map((addr) => {
                  const addrId = String(addr.id);
                  const isSelected = selectedAddressId === addrId;
                  return (
                    <div 
                      key={addrId}
                      onClick={() => setSelectedAddressId(addrId)}
                      className={`min-w-[240px] p-5 cursor-pointer transition-all snap-start relative flex flex-col ${
                        isSelected 
                          ? 'border border-[#191919] bg-[#FAFAFA]' 
                          : 'border border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-5 right-5">
                          <CheckCircle2 className="w-4 h-4 text-[#191919] fill-[#191919] text-white" />
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 mb-3">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                        <span className="font-sans text-[11px] font-bold tracking-[0.1em] uppercase text-[#191919] truncate pr-6">
                          {addr.name}
                        </span>
                      </div>
                      
                      <p className="font-sans text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed">
                        {addr.address}<br />{addr.city} - {addr.postalCode}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="px-6 py-6 border-t border-gray-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            
            <div className="flex justify-between items-center mb-6">
              <span className="font-sans text-[16px] text-[#191919]">
                Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})
              </span>
              <span className="font-sans text-[20px] font-medium text-[#191919]">
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>

            <Link 
              href="/checkout" 
              onClick={onClose}
              className="block w-full bg-[#222222] text-white py-4 text-center font-sans text-[12px] font-medium tracking-[0.15em] uppercase hover:bg-black transition-colors mb-4"
            >
              Continue to Checkout
            </Link>

            <p className="text-center font-sans text-[11px] text-[#191919] tracking-wide">
              Psst, get it now before it sells out.
            </p>
          </div>
        )}

      </div>
    </>
  );
}
