'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { API_URL } from '@/lib/api';

interface Banner {
  id: string;
  title: string;
  buttonText?: string;
  buttonLink?: string;
  imageUrl?: string;
}

function useBanners(position: string) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/banners?position=${position}`)
      .then(r => r.json())
      .then((data: Banner[]) => {
        setBanners(Array.isArray(data) ? data.filter(b => b.imageUrl) : []);
      })
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  }, [position]);

  return { banners, loading };
}

// ─── PromoBento (3-column promo grid) ────────────────────────────────────────
export function PromoBento() {
  const { banners, loading } = useBanners('promo_bento');

  if (loading || banners.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-16 bg-primary-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 w-full">
          {banners.map(promo => (
            <Link
              key={promo.id}
              href={promo.buttonLink || '/shop'}
              className="relative w-full aspect-[4/5] bg-[#d9d9d9] group overflow-hidden flex flex-col items-center justify-center cursor-pointer"
            >
              {promo.imageUrl && (
                <img
                  src={promo.imageUrl}
                  alt={promo.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 object-cover w-full h-full transition-transform duration-[800ms] ease-out group-hover:scale-105 will-change-transform"
                />
              )}
              <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/10" />
              <div className="relative z-10 flex flex-col items-center text-center px-4">
                <h3 className="font-serif text-2xl lg:text-3xl text-primary-dark mb-6 transition-colors duration-300 group-hover:text-black">
                  {promo.title}
                </h3>
                <div className="bg-primary-light text-primary-dark px-8 py-3.5 font-sans font-bold tracking-widest uppercase text-[10px] md:text-xs shadow-sm transition-transform duration-300 ease-out group-hover:-translate-y-1">
                  {promo.buttonText || 'SHOP NOW'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FeatureBlocks (full-height 3-col with overlay buttons) ──────────────────
export function FeatureBlocks() {
  const { banners, loading } = useBanners('feature_blocks');

  if (loading || banners.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-10 bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {banners.map(block => (
            <div
              key={block.id}
              className="relative w-full aspect-[3/4] md:aspect-[4/5] bg-gray-200 group overflow-hidden flex flex-col items-center justify-center"
            >
              {block.imageUrl && (
                <img
                  src={block.imageUrl}
                  alt={block.title}
                  className="absolute inset-0 object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-black/20 transition-opacity duration-300 group-hover:bg-black/30" />
              <div className="relative z-10 flex flex-col items-center text-center px-4">
                <h3 className="font-serif text-3xl text-white mb-6">{block.title}</h3>
                <Link
                  href={block.buttonLink || '/shop'}
                  className="bg-white/90 text-primary-dark px-8 py-3 font-sans text-[11px] font-bold tracking-widest uppercase hover:bg-white transition-colors"
                >
                  {block.buttonText || 'SHOP NOW'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Keep default export as PromoBento for backward compat
export default PromoBento;
