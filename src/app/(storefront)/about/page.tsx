import React from 'react';
import { Heart, Leaf, Scissors, User, ShoppingBag } from 'lucide-react';
import { fetchStorefrontBannersForPosition, firstStorefrontBanner } from '@/lib/storefrontBanners';

async function getAboutBanner() {
  try {
    const list = await fetchStorefrontBannersForPosition('about_section');
    return firstStorefrontBanner(list);
  } catch {
    return null;
  }
}

export default async function AboutPage() {
  const banner = await getAboutBanner();
  return (
    <div className="min-h-screen bg-[#FCFBF9] text-[#2C2C2C] font-sans selection:bg-[#E8E2D9]">
      <style dangerouslySetInnerHTML={{
        __html: `
        .font-serif { font-family: var(--font-serif), serif; }
        .font-sans { font-family: var(--font-sans), sans-serif; }
      `}} />

      {/* --- 1. HERO SECTION --- */}
      <section className="relative h-[70vh] min-h-[600px] w-full flex items-center">
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: banner?.imageUrl
              ? `url('${banner.imageUrl}')`
              : "url('https://images.unsplash.com/photo-1517330357046-3ab5a5dd42a1?q=80&w=2560&auto=format&fit=crop')",
          }}
        >
          {/* Subtle gradient overlay to make text readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-content mx-auto px-8 md:px-16 w-full">
          <div className="max-w-2xl text-white">
            <p className="text-[10px] uppercase tracking-[0.3em] mb-4 font-medium opacity-90">AARAH — THAIMAI AADAI</p>
            <h1 className="text-5xl md:text-6xl font-serif leading-tight mb-6">
              Motherhood is a Journey<br />not just a moment.
            </h1>
            <p className="text-sm md:text-base font-light leading-relaxed opacity-90 max-w-lg">
              Aarah was born out of the thought that every mother deserves clothing that makes her feel beautiful and comfortable during pregnancy and beyond.
            </p>
          </div>
        </div>
      </section>

      {/* --- 2. OUR MISSION SECTION --- */}
      <section className="py-24 px-8 max-w-content mx-auto text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-6">Our Mission</p>
        <h2 className="text-2xl md:text-3xl font-serif max-w-4xl mx-auto leading-relaxed mb-20 text-[#1a1a1a]">
          At AARAH – Thaimai Aadai, we create clothing that supports women during pregnancy, after delivery, and throughout their breastfeeding journey.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 max-w-5xl mx-auto">
          {/* Feature 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center mb-6 text-gray-600">
              <Heart className="w-5 h-5 stroke-[1.5]" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3">Thoughtfully Sourced</h3>
            <p className="text-sm text-gray-500 leading-relaxed max-w-[250px]">
              We use breathable, sustainable fabrics to keep you cool and comfortable all day.
            </p>
          </div>
          {/* Feature 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center mb-6 text-gray-600">
              <Leaf className="w-5 h-5 stroke-[1.5]" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3">Consciously Crafted</h3>
            <p className="text-sm text-gray-500 leading-relaxed max-w-[250px]">
              Clothing designed to grow with you, ensuring longevity and lasting wear.
            </p>
          </div>
          {/* Feature 3 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center mb-6 text-gray-600">
              <Scissors className="w-5 h-5 stroke-[1.5]" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3">Ethically Made</h3>
            <p className="text-sm text-gray-500 leading-relaxed max-w-[250px]">
              Proudly designed and manufactured in India, empowering local artisans.
            </p>
          </div>
        </div>
      </section>

      {/* --- 3. DESIGNED FOR EVERY STAGE --- */}
      <section className="py-24 bg-white px-8">
        <div className="max-w-content mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

          {/* Left Text Content */}
          <div className="pl-0 lg:pl-12">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-6">Comfort Meets Style</p>
            <h2 className="text-4xl font-serif mb-8 text-[#1a1a1a]">Designed for Every Stage</h2>
            <p className="text-gray-500 mb-12 leading-relaxed text-sm">
              We believe in clothing that adapts to your changing body. Our signature silhouettes are crafted to provide ease without compromising on elegance, ensuring you look and feel your absolute best.
            </p>

            <div className="space-y-8">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-2">Maternity Comfort</h4>
                <p className="text-sm text-gray-500">Gentle, stretchy fabrics that accommodate your growing bump.</p>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-2">Nursing Friendly</h4>
                <p className="text-sm text-gray-500">Discreet zippers and functional buttons for easy feeding access.</p>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-2">Postpartum Ease</h4>
                <p className="text-sm text-gray-500">Relaxed fits tailored for healing bodies and effortless everyday wear.</p>
              </div>
            </div>
          </div>

          {/* Right Images (Overlapping Layout) */}
          <div className="relative pr-0 lg:pr-12 mt-12 lg:mt-0 flex justify-end">
            <img
              src="https://images.unsplash.com/photo-1555252834-4b5377f0dfb2?q=80&w=1000&auto=format&fit=crop"
              alt="Mother holding baby"
              className="w-4/5 object-cover rounded-sm aspect-[4/5]"
            />
            {/* Overlapping small image */}
            <div className="absolute bottom-16 left-0 w-2/5 aspect-square border-8 border-white bg-white shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop"
                alt="Fabric texture"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

        </div>
      </section>

      {/* --- 4. WHY CHOOSE AARAH Grid --- */}
      <section className="py-32 px-8 max-w-content mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-4">A Commitment to Care</p>
            <h2 className="text-4xl font-serif text-[#1a1a1a]">Why Choose<br />AARAH?</h2>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-3">Premium Fabrics</h4>
              <p className="text-sm text-gray-500 leading-relaxed">Soft, breathable, and strictly safe for both mother and baby. We source materials that feel like a second skin.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-3">Functional Design</h4>
              <p className="text-sm text-gray-500 leading-relaxed">Hidden zippers, deep pockets, and adaptable fits designed specifically for the realities of motherhood.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-3">Versatile Styles</h4>
              <p className="text-sm text-gray-500 leading-relaxed">From lounging at home to stepping out in confidence, our pieces transition seamlessly across your day.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-3">Local Empowerment</h4>
              <p className="text-sm text-gray-500 leading-relaxed">Supporting local artisans and practicing sustainable, small-batch manufacturing right here in India.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- 5. OUR STORY --- */}
      <section className="py-24 bg-white px-8">
        <div className="max-w-content mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <img
              src="https://images.unsplash.com/photo-1601662528567-526cd06f6582?q=80&w=1200&auto=format&fit=crop"
              alt="Macrame wall hanging"
              className="w-full h-[400px] object-cover rounded-sm"
            />
          </div>
          <div className="pr-0 lg:pr-12">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-6">Our Story</p>
            <h2 className="text-3xl font-serif mb-8 text-[#1a1a1a] leading-snug">
              AARAH - Thaimai Aadai was founded with a beautiful vision: To celebrate women in their most transformative phase: motherhood.
            </h2>
            <p className="text-gray-500 mb-10 leading-relaxed text-sm">
              It started with a simple realization that pregnancy clothing often forces a compromise between comfort and personal style. We wanted to bridge that gap. Aarah was built to provide elegant, highly functional garments that respect the journey of a woman's body, bringing confidence and ease to everyday life.
            </p>
            <button className="text-xs font-bold uppercase tracking-[0.2em] border-b border-black pb-1 hover:text-gray-500 hover:border-gray-500 transition-colors">
              Read The Full Story
            </button>
          </div>
        </div>
      </section>

      {/* --- 6. CTA BANNER --- */}
      <section className="relative h-[400px] w-full flex items-center justify-center text-center">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=2560&auto=format&fit=crop')" }} // Forest canopy placeholder
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <div className="relative z-10 px-8">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">Your journey deserves beautiful support.</h2>
          <p className="text-white/80 text-sm uppercase tracking-widest mb-8">Explore our signature collection.</p>
          <button className="bg-white text-black px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#E8E2D9] transition-colors">
            Explore Collection
          </button>
        </div>
      </section>

      {/* --- 7. INSTAGRAM SECTION --- */}
      <section className="py-24 px-8 max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-serif text-[#1a1a1a] mb-4">Follow Instagram</h2>
        <p className="text-sm text-gray-500 mb-16">Join our community of mothers sharing their journey with AARAH.</p>

        {/* Center Image */}
        <div className="flex justify-center mb-20">
          <div className="w-[300px] h-[350px] relative">
            <img
              src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=800&auto=format&fit=crop"
              alt="Instagram Post"
              className="w-full h-full object-cover rounded-sm"
            />
            {/* Geometric overlay design (replica of the thin green lines) */}
            <div className="absolute inset-4 border border-white/40 pointer-events-none mix-blend-overlay"></div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-gray-200 pt-16">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 flex items-center justify-center text-gray-400 mb-4"><Heart className="w-5 h-5" /></div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-2 text-[#1a1a1a]">Maternity Kurtis</h4>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Elegant, comfortable fits designed to flatter your growing bump across all trimesters.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 flex items-center justify-center text-gray-400 mb-4"><User className="w-5 h-5" /></div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-2 text-[#1a1a1a]">Feeding Tops</h4>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Smart, discreet zippers and buttons for easy nursing access anywhere, anytime.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 flex items-center justify-center text-gray-400 mb-4"><ShoppingBag className="w-5 h-5" /></div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-2 text-[#1a1a1a]">Comfort Bottoms</h4>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Lounge pants and leggings with ultra-soft over-belly bands for maximum comfort.</p>
          </div>
        </div>
      </section>

    </div>
  );
}