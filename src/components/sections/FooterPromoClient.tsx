'use client';

import Image from 'next/image';
import Link from 'next/link';

interface Banner {
  imageUrl: string;
  title?: string | null;
  subtitle?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
}

export default function FooterPromoClient({ banner }: { banner: Banner | null }) {
  if (!banner?.imageUrl?.trim()) return null;

  return (
    <div className="w-full relative overflow-hidden" style={{ aspectRatio: '16/4', maxHeight: '200px' }}>
      <Image
        src={banner.imageUrl.trim()}
        alt={banner.title || 'Footer Promo'}
        fill
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
        {banner.title && (
          <h3 className="font-serif text-2xl md:text-3xl text-white mb-2">{banner.title}</h3>
        )}
        {banner.subtitle && (
          <p className="font-sans text-sm text-white/90 mb-4 max-w-md">{banner.subtitle}</p>
        )}
        {banner.buttonText && banner.buttonLink && (
          <Link
            href={banner.buttonLink}
            className="bg-white text-[#191919] px-8 py-3 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-100 transition-colors"
          >
            {banner.buttonText}
          </Link>
        )}
      </div>
    </div>
  );
}
