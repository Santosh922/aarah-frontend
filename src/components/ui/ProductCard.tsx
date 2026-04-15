'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Check, Plus, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { getPrimaryImage, getAvailableSizes } from '@/lib/product-utils';

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  mrp?: number;
  image?: string;
  images?: { url: string; isPrimary: boolean; alt?: string }[];
  url?: string;
  subtitle?: string;
  shortDescription?: string;
  description?: string;
  descriptionHtml?: string;
  tags?: string[];
  variants?: { id?: string; size: string; color?: string; stock: number; sku?: string }[];
  createdAt?: string;
  sizes?: string[];
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  featured?: boolean;
  fabric?: string;
  category?: string;
  subcategory?: string;
  stock?: number;
  status?: string;
  reviews?: { rating: number; comment?: string; userName?: string; createdAt?: string }[];
}

export type Variant = { id?: string; size: string; color?: string; stock: number; sku?: string };

interface Props { product: Product; variant?: 'grid' | 'wishlist-panel' }

export default function ProductCard({ product, variant = 'grid' }: Props) {
  const router = useRouter();
  const { addToCart, updateQuantity, cartItems, favorites, toggleFavorite } = useCart();
  const [showSuccess, setShowSuccess] = useState(false);
  const [sizeAction, setSizeAction] = useState<'cart' | 'buyNow' | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const image = getPrimaryImage(product);
  const availableSizes = getAvailableSizes(product);
  const inWishlist = favorites.includes(String(product.id));
  const isSelectingSize = sizeAction !== null;

  const totalQuantityInCart = cartItems
    .filter(i => String(i.id) === String(product.id))
    .reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setSizeAction(null);
      }
    };
    if (isSelectingSize) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSelectingSize]);

  const handleInitialBagClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (availableSizes.length === 0) return;

    if (availableSizes.length === 1) {
      executeAdd(availableSizes[0]);
    } else {
      setSizeAction((prev) => (prev === 'cart' ? null : 'cart'));
    }
  };

  const handleBuyNowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (availableSizes.length === 0) return;

    if (availableSizes.length === 1) {
      executeAdd(availableSizes[0], e, true);
    } else {
      setSizeAction((prev) => (prev === 'buyNow' ? null : 'buyNow'));
    }
  };

  const executeAdd = (selectedSize: string, e?: React.MouseEvent, shouldCheckout = false) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const selectedVariant = product.variants?.find(v => v.size === selectedSize && v.stock > 0);
    const existingCartItem = cartItems.find(i => String(i.id) === String(product.id) && i.size === selectedSize);

    if (!existingCartItem) {
      addToCart({
        id: String(product.id),
        variantId: selectedVariant?.id,
        name: product.name,
        size: selectedSize,
        price: product.price,
        image,
        quantity: 1
      }, true);
    } else {
      updateQuantity(String(product.id), selectedSize, 1);
    }

    setSizeAction(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    if (shouldCheckout) {
      router.push('/checkout');
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  const renderBadge = () => {
    if (showSuccess) {
      return (
        <div className="absolute -top-1.5 -right-1.5 w-[22px] h-[22px] bg-[#00a859] rounded-full flex items-center justify-center z-20 shadow-sm animate-[popIn_0.3s_ease-out_forwards]">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
      );
    }
    
    if (totalQuantityInCart > 0) {
      return (
        <div className="absolute -top-1.5 -right-1.5 w-[22px] h-[22px] bg-white rounded-full flex items-center justify-center z-20 text-[#191919] shadow-sm font-sans text-[10px] font-bold">
          {totalQuantityInCart}
        </div>
      );
    }
    
    return (
      <div className="absolute -top-1.5 -right-1.5 w-[22px] h-[22px] bg-white rounded-full flex items-center justify-center z-20 text-black shadow-sm group-hover/btn:border-[#f0f0f0] transition-colors">
        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
      </div>
    );
  };

  const productUrl = product.url || `/product/${product.slug || product.id}`;
  const subtitle = (product.shortDescription || product.subtitle || '').trim();
  const displayTags = (product.tags || [])
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 3);
  const discountPct = product.mrp && product.mrp > product.price
    ? Math.round((1 - product.price / product.mrp) * 100) : 0;

  return (
    <div className="flex flex-col relative group text-left w-full cursor-pointer h-full">

      <div className="relative w-full aspect-[4/5] bg-[#F5F5F5] overflow-hidden">
        <Link href={productUrl} className="block w-full h-full">
          {image ? (
            <Image 
              src={image} 
              alt={product.name} 
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority={product.isBestSeller}
            />
          ) : (
            <div className="w-full h-full bg-gray-100" />
          )}
        </Link>

        {discountPct > 0 && (
          <span className="absolute top-0 left-0 bg-white text-brand-discount font-sans text-[13px] font-medium px-3 py-1.5 z-10">
            {discountPct}% off
          </span>
        )}

        {(product.isNewArrival || product.isBestSeller) && (
          <div className="absolute top-3 left-3 z-10">
            {product.isNewArrival && (
              <span className="inline-block bg-[#191919] px-2 py-1 shadow-sm">
                <span className="font-sans text-[8px] font-bold text-white tracking-widest uppercase">Just In</span>
              </span>
            )}
            {product.isBestSeller && (
              <span className="inline-block bg-white px-2 py-1 shadow-sm">
                <span className="font-sans text-[8px] font-bold text-primary-dark tracking-widest uppercase">Best Seller</span>
              </span>
            )}
          </div>
        )}

        <button
          onClick={handleFavorite}
          className={`absolute top-3 right-3 w-10 h-10 bg-white shadow-sm flex items-center justify-center z-10 transition-all hover:scale-105 ${variant === 'wishlist-panel' ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} ${inWishlist ? 'opacity-100' : ''}`}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart 
            className={`w-5 h-5 transition-colors duration-300 ${inWishlist ? 'fill-black text-black' : 'text-gray-900'}`} 
            strokeWidth={1.5} 
          />
        </button>

        <button
          type="button"
          onClick={handleBuyNowClick}
          className="absolute bottom-4 left-4 right-4 bg-white text-black py-3.5 text-center text-xs font-bold tracking-[0.15em] opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-sm hover:bg-[#f5f5f5] cursor-pointer"
        >
          BUY NOW
        </button>
      </div>

      <div className="flex justify-between items-start mt-4 pt-1">
        
        <div className="flex flex-col flex-1 pr-3">
          <Link href={productUrl}>
            <h3 className="font-sans text-[11px] font-bold uppercase tracking-widest text-primary-dark hover:text-gray-500 transition-colors line-clamp-1 leading-tight">
              {product.name}
            </h3>
          </Link>
          
          {subtitle && (
            <p className="font-sans text-[11px] text-gray-500 mt-1 mb-2 line-clamp-2 leading-relaxed">
              {subtitle}
            </p>
          )}

          {product.fabric && (
            <p className="font-sans text-[9px] text-gray-400 tracking-widest uppercase mb-2 leading-tight">
              {product.fabric}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-auto pt-1">
            <span className="font-sans text-[14px] font-semibold text-[#191919]">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {product.mrp && product.mrp > product.price && (
              <span className="font-sans text-[13px] text-gray-400 line-through">
                ₹{product.mrp.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {displayTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gray-200 bg-[#fafafa] px-2 py-0.5 font-sans text-[9px] font-medium uppercase tracking-wide text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-shrink-0" ref={popoverRef}>
          {isSelectingSize && (
            <div className="absolute bottom-full right-0 mb-3 w-[200px] bg-white border border-gray-200 shadow-xl rounded-md p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
                  {sizeAction === 'buyNow' ? 'Select Size & Continue' : 'Select Size'}
                </span>
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSizeAction(null); }}
                  className="text-gray-400 hover:text-black"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    onClick={(e) => executeAdd(size, e, sizeAction === 'buyNow')}
                    className="py-1.5 text-xs font-semibold border border-gray-200 text-gray-700 hover:border-black hover:bg-black hover:text-white transition-all"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableSizes.length === 0 ? (
            <div className="flex-shrink-0 mt-1 px-3 py-2 bg-gray-100 rounded-full">
              <span className="font-sans text-[9px] font-bold tracking-widest uppercase text-gray-400 whitespace-nowrap">Sold Out</span>
            </div>
          ) : (
            <button
              onClick={handleInitialBagClick}
              className="group/btn relative flex-shrink-0 w-10 h-10 rounded-full bg-[#191919] flex items-center justify-center transition-colors hover:bg-black mt-1 shadow-sm"
            >
              <ShoppingBag className="w-[18px] h-[18px] text-white" strokeWidth={1.5} />
              {renderBadge()}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
