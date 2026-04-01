'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';

interface Props {
  title?: string;
  subtitle?: string;
  products: any[];
}

export default function ProductCarousel({ 
  title = "Everyone Favorites", 
  subtitle = "Thoughtfully Designed. Consciously Crafted.", 
  products 
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="w-full py-24 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl md:text-4xl text-[#191919] mb-4">{title}</h2>
          {subtitle && (
            <p className="font-sans text-[11px] text-gray-500 tracking-[0.2em] uppercase">{subtitle}</p>
          )}
        </div>

        <div className="relative group">
          
          <button 
            onClick={() => scroll('left')} 
            className="absolute -left-4 md:-left-6 top-[40%] -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-md text-gray-500 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
          </button>

          <div 
            ref={scrollRef} 
            className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-8 pt-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {products.map((product) => {
              const parsedTags = Array.isArray(product.tags) 
                ? product.tags 
                : (typeof product.tags === 'string' ? product.tags.split(',').map((t: any) => t.trim()) : []);
              
              const cardProduct = { ...product, id: String(product.id), tags: parsedTags };
              
              return (
                <div key={product.id} className="min-w-[260px] sm:min-w-[280px] md:min-w-[calc(25%-1.125rem)] flex-shrink-0 snap-start">
                  <ProductCard product={cardProduct} />
                </div>
              );
            })}
          </div>

          <button 
            onClick={() => scroll('right')} 
            className="absolute -right-4 md:-right-6 top-[40%] -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-md text-gray-500 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </div>

      </div>
    </section>
  );
}
