'use client';

import { useState, useEffect } from 'react';

import { fetchStorefrontBannersForPosition } from '@/lib/storefrontBanners';

export default function JourneyBanner() {
  const [banner, setBanner] = useState<{
    title: string;
    subtitle: string;
    imagePath: string | null;
  }>({
    title:     'Beautiful through every stage of motherhood.',
    subtitle:  'Comfort that grows with you.',
    imagePath: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStorefrontBannersForPosition('journey_banner')
      .then((list) => {
        const b = list.find(
          (row: { imageUrl?: string }) => String(row?.imageUrl ?? '').trim() !== '',
        );
        const src = b?.imageUrl != null ? String(b.imageUrl).trim() : '';
        if (src) {
          setBanner({
            title:     b.title    || banner.title,
            subtitle:  b.subtitle || banner.subtitle,
            imagePath: src,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !banner.imagePath) {
    return null;
  }

  return (
    <section className="w-full py-20 bg-primary-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="relative w-full h-[40vh] min-h-[300px] md:min-h-[380px] bg-cover bg-center overflow-hidden shadow-sm"
          style={{ backgroundImage: `url(${banner.imagePath})` }}
        >
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
            <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl text-white font-medium mb-4 drop-shadow-lg max-w-2xl leading-tight">
              {banner.title}
            </h2>
            <p className="font-sans text-white/90 text-[15px] md:text-base font-light tracking-wide leading-relaxed">
              {banner.subtitle}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
