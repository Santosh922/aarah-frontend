'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FABRICS = [
  { name: 'Cotton',     slug: 'Cotton',    image: '/assets/images/fabrics/cotton.png' },
  { name: 'Mul Mul',    slug: 'Mul-Mul',   image: '/assets/images/fabrics/mul-mul.png' },
  { name: 'Denim',      slug: 'Denim',     image: '/assets/images/fabrics/denim.png' },
  { name: 'Hakoba',     slug: 'Hakoba',    image: '/assets/images/fabrics/hakoba.png' },
  { name: 'Linen',      slug: 'Linen',     image: '/assets/images/fabrics/linen.png' },
];

const CARD_W = 260;
const GAP = 20;

export default function FabricGrid() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [locked, setLocked] = useState(false);

  const N = FABRICS.length;
  const TOTAL = N + 2;
  const STEP = CARD_W + GAP;

  const scrollTo = useCallback((index: number, smooth = true) => {
    const t = trackRef.current;
    if (!t) return;
    t.scrollTo({ left: index * STEP, behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  const jump = useCallback((index: number) => {
    const t = trackRef.current;
    if (!t) return;
    t.scrollLeft = index * STEP;
  }, []);

  const prev = useCallback(() => {
    if (locked) return;
    setActive(a => {
      const next = a === 0 ? N - 1 : a - 1;
      scrollTo(next + 1);
      return next;
    });
  }, [locked, scrollTo]);

  const next = useCallback(() => {
    if (locked) return;
    setActive(a => {
      const next = a === N - 1 ? 0 : a + 1;
      scrollTo(next + 1);
      return next;
    });
  }, [locked, scrollTo]);

  const handleScroll = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const raw = Math.round(t.scrollLeft / STEP);
    if (raw === 0) {
      setLocked(true);
      jump(N);
      setTimeout(() => setLocked(false), 50);
      setActive(0);
    } else if (raw === TOTAL - 1) {
      setLocked(true);
      jump(1);
      setTimeout(() => setLocked(false), 50);
      setActive(0);
    } else {
      setActive(raw - 1);
    }
  }, [N, TOTAL, STEP, jump]);

  useEffect(() => {
    jump(1);
  }, [jump]);

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    t.addEventListener('scroll', handleScroll, { passive: true });
    return () => t.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  const items = [FABRICS[N - 1], ...FABRICS, FABRICS[0]];

  return (
    <section className="w-full py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col items-center mb-14">
          <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-gray-400 mb-3">
            Curated Collections
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-primary-dark tracking-wide">
            Shop by Fabric
          </h2>
          <div className="w-12 h-px bg-gray-300 mt-5" />
        </div>

        {/* Carousel wrapper */}
        <div className="relative group">

          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-28 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          {/* Left arrow */}
          <button
            onClick={prev}
            className="absolute left-[-60px] top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center transition-all duration-300 hover:bg-primary-dark hover:border-primary-dark hover:text-white hover:shadow-lg hover:scale-105 opacity-0 group-hover:opacity-100 disabled:opacity-30"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          </button>

          {/* Right arrow */}
          <button
            onClick={next}
            className="absolute right-[-60px] top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center transition-all duration-300 hover:bg-primary-dark hover:border-primary-dark hover:text-white hover:shadow-lg hover:scale-105 opacity-0 group-hover:opacity-100 disabled:opacity-30"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2} />
          </button>

          {/* Track */}
          <div
            ref={trackRef}
            className="flex gap-5 overflow-x-auto pb-4 cursor-grab active:cursor-grabbing select-none"
            style={{ scrollBehavior: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {items.map((f, i) => (
              <Link
                key={`${f.slug}-${i}`}
                href={`/fabrics/${encodeURIComponent(f.slug)}`}
                className="flex-shrink-0 group/card relative"
                style={{ width: CARD_W }}
              >
                <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.image}
                    alt={f.name}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-105"
                    draggable={false}
                  />
                  {/* Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-50 group-hover/card:opacity-70 transition-opacity duration-500" />
                  {/* Label */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <span className="font-serif text-white text-xl tracking-wide block">
                      {f.name}
                    </span>
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/20 transition-all duration-500 flex items-center justify-center opacity-0 group-hover/card:opacity-100">
                    <span className="bg-white text-primary-dark font-sans text-[10px] font-medium tracking-[0.2em] uppercase px-5 py-2.5 shadow-lg translate-y-2 group-hover/card:translate-y-0 transition-transform duration-500">
                      Explore
                    </span>
                  </div>
                </div>
                <p className="font-sans text-[11px] font-medium tracking-[0.2em] uppercase text-primary-dark text-center mt-4 group-hover/card:text-black transition-colors duration-300">
                  {f.name}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2.5 mt-10">
          {FABRICS.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i + 1)}
              className="rounded-full transition-all duration-400"
              style={{
                width: i === active ? 24 : 8,
                height: 8,
                background: i === active ? '#191919' : '#d1d5db',
              }}
              aria-label={`Go to ${FABRICS[i].name}`}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-center mt-10">
          <Link
            href="/shop"
            className="group inline-flex items-center gap-3 bg-primary-dark text-white px-10 py-4 font-sans text-[11px] font-medium tracking-[0.2em] uppercase hover:bg-black transition-all duration-300 shadow-sm hover:shadow-md"
          >
            View All Collections
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
