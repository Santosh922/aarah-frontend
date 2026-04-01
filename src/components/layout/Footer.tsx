'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Instagram, Loader2 } from 'lucide-react';
import { API_URL } from '@/lib/api';
import FooterPromoClient from '@/components/sections/FooterPromoClient';

interface FooterBanner {
  imageUrl: string;
  title?: string | null;
  subtitle?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
}

export default function Footer({ footerBanner }: { footerBanner: FooterBanner | null }) {
  const FOOTER_LINKS = [
    { name: 'CATEGORIES',        href: '/shop' },
    { name: 'AVAILABLE FABRICS', href: '/shop/fabrics' },
    { name: 'BEST-SELLERS',      href: '/best-sellers' },
    { name: 'NEW ARRIVALS',      href: '/new-arrivals' },
    { name: 'ABOUT US',          href: '/about' },
    { name: 'CONTACT',           href: '/contact' },
    { name: 'TERMS & CONDITIONS', href: '/terms' },
  ];

  const BRAND_TEXT   = 'Beautiful through every stage of motherhood. Designed for comfort, crafted with care.';
  const COPYRIGHT_LEFT  = `© ${new Date().getFullYear()} Aarah. All rights reserved.`;
  const COPYRIGHT_RIGHT = 'Made in India with love.';

  type SubscribeStatus = 'idle' | 'loading' | 'success' | 'error' | 'duplicate';
  const [instagramUrl, setInstagramUrl] = useState('https://instagram.com');
  const [email, setEmail]               = useState('');
  const [status, setStatus]             = useState<SubscribeStatus>('idle');

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/settings`)
      .then(r => r.json())
      .then(settings => {
        if (settings?.instagramUrl) setInstagramUrl(settings.instagramUrl);
      })
      .catch(() => {});
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) return;

    // Basic email format check before hitting the server
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setStatus('error');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch(`${API_URL}/api/storefront/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed.toLowerCase() }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
        // Reset to idle after 4s so they can subscribe again if needed
        setTimeout(() => setStatus('idle'), 4000);
        return;
      }

      // 409 Conflict = already subscribed — treat as a soft success
      if (res.status === 409) {
        setStatus('duplicate');
        setTimeout(() => setStatus('idle'), 4000);
        return;
      }

      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);

    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const isLoading = status === 'loading';

  return (
    <footer className="w-full bg-[#f6f6f6] pt-0 pb-6">
      <div className="max-w-7xl mx-auto px-0 sm:px-0 lg:px-0">
        <FooterPromoClient banner={footerBanner!} />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-8 mb-16">

          {/* Column 1: Logo & brand text */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center overflow-hidden">
                <img src="/assets/logo.png" alt="AARAH Logo" className="w-7 h-7 object-contain" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-serif text-xl font-bold leading-none tracking-tight text-primary-dark">AARAH</span>
                <span className="font-sans text-[7px] font-light tracking-[0.4em] text-gray-400">THAIMAI AADAI</span>
              </div>
            </div>
            <p className="font-sans text-sm text-primary-dark max-w-xs leading-relaxed">
              {BRAND_TEXT}
            </p>
          </div>


          {/* Column 2: Quick links */}
          <div className="flex flex-col md:pl-8">
            <h5 className="font-sans text-[13px] font-medium text-primary-dark mb-6">Quick Links</h5>
            <div className="flex flex-col space-y-4">
              {FOOTER_LINKS.map(link => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="font-sans text-xs text-gray-500 hover:text-primary-dark transition-colors uppercase"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 3: Newsletter + social */}
          <div className="flex flex-col items-start md:items-end w-full">
            <form onSubmit={handleSubscribe} className="w-full max-w-sm flex shadow-sm">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
                placeholder="Email Address"
                disabled={isLoading || status === 'success' || status === 'duplicate'}
                className="flex-grow bg-white border border-gray-100 px-4 py-3.5 text-xs font-sans focus:outline-none focus:border-gray-300 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isLoading || status === 'success' || status === 'duplicate'}
                className="w-14 bg-[#191919] text-white flex items-center justify-center hover:bg-black transition-colors disabled:opacity-60"
                aria-label="Subscribe"
              >
                {isLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : status === 'success' || status === 'duplicate'
                    ? <span className="text-green-400 text-[10px]">✓</span>
                    : <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                }
              </button>
            </form>

            {/* Status messages */}
            {status === 'success' && (
              <p className="font-sans text-[10px] text-semantic-success mt-2 tracking-widest uppercase">
                You're subscribed!
              </p>
            )}
            {status === 'duplicate' && (
              <p className="font-sans text-[10px] text-gray-400 mt-2 tracking-widest uppercase">
                Already subscribed — you're all set.
              </p>
            )}
            {status === 'error' && (
              <p className="font-sans text-[10px] text-semantic-error mt-2 tracking-widest uppercase">
                Please enter a valid email address.
              </p>
            )}

            <div className="mt-6 w-full max-w-sm flex justify-end">
              <Link
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-[#191919] text-white flex items-center justify-center hover:bg-black transition-colors shadow-sm"
              >
                <Instagram className="w-4 h-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>

        </div>

        {/* Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-200 pt-0">
          <p className="font-sans text-[10px] text-gray-400 tracking-wider">{COPYRIGHT_LEFT}</p>
          <p className="font-sans text-[10px] text-gray-400 tracking-wider mt-2 md:mt-0">{COPYRIGHT_RIGHT}</p>
        </div>

      </div>
    </footer>
  );
}
