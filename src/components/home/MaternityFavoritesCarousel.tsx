'use client';

import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import ProductCard, { Product } from '../ui/ProductCard';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  initialProducts?: Product[];
}

export default function MaternityFavoritesCarousel({ initialProducts = [] }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: false, dragFree: true });
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      const formatted = initialProducts.map(p => ({
        ...p,
        id: p.id,
        image: p.images?.find(img => img.isPrimary)?.url || p.images?.[0]?.url || p.image || '',
      }));
      setProducts(formatted);
    }
    setIsLoading(false);
  }, [initialProducts]);

  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };
    
    emblaApi.on('select', onSelect);
    onSelect();
    
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  if (isLoading) {
    return (
      <section className="w-full py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-primary-dark mb-2 tracking-tight">Maternity Favorites</h2>
            <p className="font-sans text-[11px] text-gray-500 tracking-[0.15em] uppercase">Beautifully Functional. Purposefully Designed.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col">
                <div className="w-full aspect-[4/5] bg-gray-200 mb-4 rounded-sm" />
                <div className="h-4 bg-gray-200 w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="w-full py-16 md:py-20 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl md:text-4xl text-primary-dark mb-2 tracking-tight">
            Maternity Favorites
          </h2>
          <p className="font-sans text-[11px] text-gray-500 tracking-[0.15em] uppercase">
            Beautifully Functional. Purposefully Designed. Consciously Crafted.
          </p>
        </div>

        <div className="relative">
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white shadow-md transition-all ${
              canScrollPrev ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-5 h-5 text-primary-dark" />
          </button>

          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white shadow-md transition-all ${
              canScrollNext ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-5 h-5 text-primary-dark" />
          </button>

          <div className="overflow-hidden mx-8 md:mx-16" ref={emblaRef}>
            <div className="flex gap-5 md:gap-6">
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className="flex-[0_0_160px] sm:flex-[0_0_180px] md:flex-[0_0_220px] min-w-0"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            href="/shop"
            className="inline-block border-b border-primary-dark pb-0.5 font-sans text-[11px] font-bold tracking-[0.2em] uppercase text-primary-dark hover:text-gray-500 hover:border-gray-500 transition-colors"
          >
            View All Favorites
          </Link>
        </div>
      </div>
    </section>
  );
}
