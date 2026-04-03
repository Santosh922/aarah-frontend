'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useHeroContent } from '@/hooks/useApi';

export default function HeroSection() {
  const { data: heroes, loading } = useHeroContent();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!heroes || heroes.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroes]);

  if (loading || !heroes || heroes.length === 0) {
    return null;
  }

  const validHeroes = heroes.filter(h => h && typeof h.backgroundImage === 'string' && h.backgroundImage.trim() !== '');

  if (validHeroes.length === 0) {
    return null;
  }

  const boundedIndex = activeIndex % validHeroes.length;
  const hero = validHeroes[boundedIndex];

  return (
    <section className="relative w-full h-[100vh] min-h-[640px] flex items-center overflow-hidden">
      {/* Background images (Carousel) */}
      {validHeroes.map((h, i) => (
        <div 
          key={i} 
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === boundedIndex ? 1 : 0, zIndex: i === boundedIndex ? 1 : 0 }}
        >
          <Image
            src={h.backgroundImage}
            alt={`Hero ${i + 1}`}
            fill
            priority={i === 0}
            className="object-cover"
          />
        </div>
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent z-10" />

      {/* Content wrapper */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-10">
        <div className="max-w-[520px] transition-all duration-700 ease-in-out transform translate-y-0 opacity-100">
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

      {/* Carousel dots */}
      {validHeroes.length > 1 && (
        <div className="absolute bottom-10 left-0 right-0 z-30 flex justify-center gap-3">
          {validHeroes.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${i === boundedIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
