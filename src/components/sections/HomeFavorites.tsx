'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import { API_URL } from '@/lib/api';
import { extractProducts, filterActiveProducts, toUiProduct } from '@/lib/productAdapter';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  mrp: number;
  tags: string[];
  fabric?: string;
  images: { url: string; isPrimary: boolean; alt?: string }[];
  variants: { id: string; size: string; color?: string; stock: number }[];
}

export default function HomeFavorites() {
  const [products, setProducts] = useState<Product[]>([]);
  const [mounted, setMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('aarah_favorites');
    if (!stored) return;
    try {
      const favoriteIds: string[] = JSON.parse(stored);
      if (!Array.isArray(favoriteIds) || favoriteIds.length === 0) return;
      fetch(`${API_URL}/api/storefront/products?ids=${favoriteIds.join(',')}&pageSize=50`)
        .then(r => r.ok ? r.json() : null)
        .then(payload => {
          if (!payload) return;
          const products = filterActiveProducts(extractProducts(payload)).map(toUiProduct);
          setProducts(products as Product[]);
        })
        .catch(() => {});
    } catch {}
  }, []);

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atLeft = el.scrollLeft <= 2;
    const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setCanScrollLeft(!atLeft);
    setCanScrollRight(!atRight);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState, products]);

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
  };

  if (!mounted || products.length === 0) return null;

  return (
    <section className="w-full py-20 bg-white animate-in fade-in duration-700 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">

        <div className="text-center mb-14">
          <h2 className="font-serif text-[32px] md:text-[40px] text-[#191919] mb-3">
            Your Personal Edit
          </h2>
          <span className="font-sans text-[13px] md:text-[15px] font-normal tracking-wide text-gray-500 block">
            Saved Favorites
          </span>
        </div>

        <div className="relative group">
          
          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="absolute -left-4 md:-left-8 top-[40%] -translate-y-1/2 w-12 h-12 flex items-center justify-center text-gray-400 hover:text-black transition-colors z-20 opacity-0 group-hover:opacity-100"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-8 h-8" strokeWidth={1} />
            </button>
          )}

          <div
            ref={scrollContainerRef}
            onScroll={updateScrollState}
            className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 md:gap-6 pb-8"
          >
            {products.map((product, index) => (
              <div
                key={product.id}
                className="w-[280px] md:w-[320px] lg:w-[350px] flex-shrink-0 snap-start animate-fadeUp"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="absolute -right-4 md:-right-8 top-[40%] -translate-y-1/2 w-12 h-12 flex items-center justify-center text-gray-400 hover:text-black transition-colors z-20 opacity-0 group-hover:opacity-100"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-8 h-8" strokeWidth={1} />
            </button>
          )}
        </div>

        <div className="flex justify-center mt-6">
          <Link
            href="/shop"
            className="bg-[#191919] hover:bg-black text-white text-xs font-bold tracking-[0.15em] uppercase px-12 py-4 transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
}
