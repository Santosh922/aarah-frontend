'use client';

import { useCart } from '@/context/CartContext';
import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '@/lib/api';
import { extractList, fetchStorefrontCategories } from '@/lib/integrationAdapters';
import { parseStorefrontBannersPayload, sortStorefrontBannersBySortOrder } from '@/lib/storefrontBanners';
import type {
  HeroData,
  Product,
  ProductsResponse,
  Category,
  StoreSettings,
  InstagramPost,
  Coupon,
} from '@/types';

// Re-export useCart so existing imports from @/hooks/useApi still work
export { useCart };

// ─── Shared hook state shape ──────────────────────────────────────────────────

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

// ─── useWishlist ──────────────────────────────────────────────────────────────

export function useWishlist() {
  const { favorites, toggleFavorite } = useCart();
  const isWishlisted = useCallback(
    (id: string | number) => favorites.includes(String(id)),
    [favorites],
  );
  return { isWishlisted, toggle: toggleFavorite, favorites };
}

// ─── useHeroContent ───────────────────────────────────────────────────────────

/** Resolve relative backend paths (/uploads/...) against API_URL for next/image. */
function normalizeBannerImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  const u = String(url).trim();
  if (!u) return '';
  if (u.startsWith('http')) return u;
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${API_URL.replace(/\/$/, '')}${path}`;
}

const HERO_FALLBACK: HeroData = {
  backgroundImage: '/assets/images/hero-aaraha.jpg',
  heading: 'Made for Motherhood from Maternity to Feeding.',
  subheading: 'Breathable fabrics. Thoughtful silhouettes. Discreet feeding access.',
  buttonText: 'SHOP NOW',
  buttonLink: '/shop',
};

export function useHeroContent(): AsyncState<HeroData[]> {
  const [data, setData] = useState<HeroData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/banners?position=hero_main`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(parseStorefrontBannersPayload)
      .then(sortStorefrontBannersBySortOrder)
      .then((banners) => {
        if (banners.length === 0) {
          setData([HERO_FALLBACK]);
          return;
        }

        const mappedBanners: HeroData[] = banners.map((b: any) => ({
          backgroundImage: normalizeBannerImageUrl(b.imageUrl),
          heading: b.title ?? HERO_FALLBACK.heading,
          subheading: b.subtitle ?? HERO_FALLBACK.subheading,
          buttonText: b.buttonText ?? HERO_FALLBACK.buttonText,
          buttonLink: b.buttonLink ?? HERO_FALLBACK.buttonLink,
        }));

        const withImages = mappedBanners.filter(
          (h) => h.backgroundImage.trim() !== '',
        );

        if (withImages.length > 0) {
          setData(withImages);
        } else {
          setData([HERO_FALLBACK]);
        }
      })
      .catch(err => {
        console.error('useHeroContent error:', err);
        setError('Failed to load hero content.');
        setData([HERO_FALLBACK]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

// ─── useProducts ──────────────────────────────────────────────────────────────

interface UseProductsOptions {
  bestSeller?: boolean;
  newArrival?: boolean;
  featured?: boolean;
  limit?: number;
  category?: string;
}

export function useProducts(options: UseProductsOptions = {}): AsyncState<Product[]> {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilise options object — inline literals create a new ref each render.
  const depsKey = JSON.stringify({
    bestSeller: options.bestSeller,
    newArrival: options.newArrival,
    featured: options.featured,
    limit: options.limit,
    category: options.category,
  });

  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  useEffect(() => {
    const opts = optionsRef.current;
    const params = new URLSearchParams();
    if (opts.bestSeller) params.set('bestSeller', 'true');
    if (opts.newArrival) params.set('newArrival', 'true');
    if (opts.featured)   params.set('featured',   'true');
    if (opts.limit)      params.set('pageSize',    String(opts.limit));
    if (opts.category)   params.set('category',    opts.category);

    setLoading(true);
    setError(null);

    fetch(`${API_URL}/api/storefront/products?${params}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ProductsResponse>;
      })
      .then(data => setProducts(extractList<Product>(data)))
      .catch(err => {
        console.error('useProducts error:', err);
        setError('Failed to load products.');
        setProducts([]);
      })
      .finally(() => setLoading(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  return { data: products, loading, error };
}

// ─── useCoupons ───────────────────────────────────────────────────────────────

export function useCoupons(): AsyncState<Coupon[]> {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/discounts`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Coupon[]>;
      })
      .then(data => setCoupons(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('useCoupons error:', err);
        setError('Failed to load coupons.');
        setCoupons([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data: coupons, loading, error };
}

// ─── useInstagramPosts ────────────────────────────────────────────────────────

export function useInstagramPosts(): AsyncState<InstagramPost[]> {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/instagram`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<InstagramPost[]>;
      })
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('useInstagramPosts error:', err);
        setError('Failed to load Instagram posts.');
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data: posts, loading, error };
}

// ─── useStoreSettings ─────────────────────────────────────────────────────────

export function useStoreSettings(): AsyncState<StoreSettings | null> {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/settings`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<StoreSettings>;
      })
      .then(setSettings)
      .catch(err => {
        console.error('useStoreSettings error:', err);
        setError('Failed to load store settings.');
      })
      .finally(() => setLoading(false));
  }, []);

  return { data: settings, loading, error };
}

// ─── useCategories ────────────────────────────────────────────────────────────

export function useCategories(): AsyncState<Category[]> {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStorefrontCategories()
      .then((data) => setCategories(data as unknown as Category[]))
      .catch(err => {
        console.error('useCategories error:', err);
        setError('Failed to load categories.');
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data: categories, loading, error };
}
