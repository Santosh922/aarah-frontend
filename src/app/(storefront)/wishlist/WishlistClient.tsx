'use client';

import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';

interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  mrp?: number;
  image?: string;
  images?: { url: string; isPrimary: boolean }[];
  variants?: { id?: string; size: string; stock: number }[];
  stock?: number;
  tags?: string[];
  isBestSeller?: boolean;
  isNewArrival?: boolean;
}

interface WishlistClientProps {
  wishlistProducts: WishlistProduct[];
}

function WishlistItem({ product }: { product: WishlistProduct }) {
  const totalStock = Number(product.stock ?? 0);
  const hasStock = totalStock > 0;

  return (
    <div className="relative">
      <ProductCard product={product} />
      <div className="flex items-center gap-1.5 mt-2">
        <span className={`w-2 h-2 rounded-full ${hasStock ? 'bg-[#00a859]' : 'bg-red-500'}`} />
        <span className="text-[10px] font-sans tracking-wide text-gray-500 uppercase">
          {hasStock ? `In Stock${totalStock <= 3 ? ` — only ${totalStock} left` : ''}` : 'Out of Stock'}
        </span>
      </div>
    </div>
  );
}

export default function WishlistClient({ wishlistProducts }: WishlistClientProps) {
  return (
    <main className="min-h-screen bg-white pt-40 pb-20">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-gray-100 pb-6 gap-4">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-[#191919] mb-2">Saved Items</h1>
            <p className="font-sans text-sm text-gray-500">
              {wishlistProducts.length} {wishlistProducts.length === 1 ? 'product' : 'products'} carefully curated by you.
            </p>
          </div>
          <button
            onClick={async () => {
              const shareData = {
                title: 'My Aarah Wishlist',
                text: `Check out my saved maternity favourites from AARAH!`,
                url: window.location.href,
              };
              if (navigator.share && navigator.canShare?.(shareData)) {
                await navigator.share(shareData);
              } else {
                await navigator.clipboard.writeText(window.location.href);
                alert('Wishlist link copied to clipboard!');
              }
            }}
            className="self-start md:self-auto text-xs font-bold tracking-widest uppercase text-gray-500 hover:text-black border-b border-transparent hover:border-black transition-all pb-0.5 cursor-pointer"
            aria-label="Share wishlist"
          >
            Share Wishlist
          </button>
        </div>

        {wishlistProducts.length === 0 ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-24 h-24 bg-[#F5F5F5] rounded-full flex items-center justify-center mb-8">
              <Heart className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
            </div>
            <h2 className="font-serif text-2xl md:text-3xl text-[#191919] mb-4">
              Your wishlist is empty
            </h2>
            <p className="font-sans text-sm text-gray-500 mb-10 max-w-md text-center leading-relaxed">
              Save your favorite maternity pieces here to revisit later, keep track of availability, or share with loved ones.
            </p>
            <Link 
              href="/shop" 
              className="inline-flex items-center gap-2 bg-[#191919] text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
            >
              Explore Collection
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
            {wishlistProducts.map((product: WishlistProduct) => (
              <WishlistItem key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
