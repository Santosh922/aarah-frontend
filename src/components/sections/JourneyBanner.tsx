'use client';

import { useState, useEffect } from 'react';

import { API_URL } from '@/lib/api';

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
    fetch(`${API_URL}/api/storefront/banners?position=journey_banner`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0 && data[0].imageUrl) {
          const b = data[0];
          setBanner({
            title:     b.title    || banner.title,
            subtitle:  b.subtitle || banner.subtitle,
            imagePath: b.imageUrl,
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
