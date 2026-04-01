'use client';

import Link from 'next/link';
import { useHeroContent } from '@/hooks/useApi';

export default function HeroSection() {
  const { data: hero, loading } = useHeroContent();

  if (loading || !hero || !hero.backgroundImage) {
    return null;
  }

  return (
    <section className="relative w-full h-[100vh] min-h-[640px] flex items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={hero.backgroundImage}
          alt="Hero"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10">
        <div className="max-w-[520px]">
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/70 mb-5">
            New Collection
          </p>
          <h1 className="font-serif text-[42px] md:text-[54px] lg:text-[60px] text-white leading-[1.05] mb-6">
            {hero.heading}
          </h1>
          <p className="text-sm text-white/80 leading-relaxed mb-10 font-light max-w-[400px]">
            {hero.subheading}
          </p>
          <Link
            href={hero.buttonLink}
            className="inline-block bg-white text-[#191919] px-10 py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-gray-100 transition-colors shadow-lg"
          >
            {hero.buttonText}
          </Link>
        </div>
      </div>
    </section>
  );
}
