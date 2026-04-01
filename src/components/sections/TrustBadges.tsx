'use client';

import { useState, useEffect } from 'react';
import { Leaf, Heart, Truck } from 'lucide-react';

import { API_URL } from '@/lib/api';

// Real brand copy — replaces lorem ipsum completely
const DEFAULT_BADGES = [
  {
    id: 1,
    icon: <Heart className="w-6 h-6 text-primary-dark" strokeWidth={1} />,
    title: 'Maternity Comfort',
    description: 'Every garment is designed to accommodate your changing body through pregnancy, with thoughtful cuts that give room where you need it most.',
  },
  {
    id: 2,
    icon: <Leaf className="w-6 h-6 text-primary-dark" strokeWidth={1} />,
    title: 'Breathable Fabrics',
    description: 'We source only the softest, most breathable cotton and mul mul fabrics — gentle on sensitive skin and kind to the environment.',
  },
  {
    id: 3,
    icon: <Truck className="w-6 h-6 text-primary-dark" strokeWidth={1} />,
    title: 'Free Delivery',
    description: 'Complimentary shipping on every order across India. Your Aarah pieces arrive beautifully packaged within 2–5 working days.',
  },
];

export default function TrustBadges() {
  const [badges, setBadges] = useState(DEFAULT_BADGES);

  useEffect(() => {
    // Settings can override badge copy from admin CMS in the future
    fetch(`${API_URL}/api/storefront/settings`)
      .then(r => r.json())
      .then(settings => {
        if (Array.isArray(settings?.trustBadges) && settings.trustBadges.length > 0) {
          setBadges(settings.trustBadges.map((b: any, i: number) => ({
            ...DEFAULT_BADGES[i],
            title:       b.title       || DEFAULT_BADGES[i]?.title,
            description: b.description || DEFAULT_BADGES[i]?.description,
          })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="w-full py-20 bg-primary-light">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {badges.map(badge => (
            <div key={badge.id} className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-50 flex items-center justify-center mb-6">
                {badge.icon}
              </div>
              <h4 className="font-sans text-[13px] font-bold text-primary-dark mb-3">{badge.title}</h4>
              <p className="font-sans text-xs text-gray-500 max-w-xs leading-relaxed">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
