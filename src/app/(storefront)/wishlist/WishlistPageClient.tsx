'use client';

import { useEffect, useState } from 'react';
import WishlistClient from './WishlistClient';
import { API_URL } from '@/lib/api';
import { authFetch, safeJson, unwrapApiResponse } from '@/lib/integrationAdapters';

type WishlistRow = {
  favoriteId?: number;
  productId?: number;
  productName?: string;
  productSlug?: string;
  image?: string;
  price?: number;
  mrp?: number;
  stock?: number;
};

async function fetchWishlistRows(): Promise<WishlistRow[]> {
  const res = await authFetch(`${API_URL}/api/storefront/wishlist`, { cache: 'no-store' });
  if (!res.ok) {
    const failurePayload = await safeJson<any>(res, null);
    console.log('WISHLIST DATA:', failurePayload);
    return [];
  }
  const payload = await safeJson<any>(res, []);
  const data = unwrapApiResponse<any>(payload);
  console.log('WISHLIST DATA:', data);
  return Array.isArray(data) ? data : [];
}

function mapWishlistFallback(row: WishlistRow) {
  const rawImage = typeof row.image === 'string' ? row.image.trim() : '';
  const image = rawImage.startsWith('/uploads/')
    ? `${API_URL}${rawImage}`
    : (rawImage || '/assets/images/fabric-placeholder.jpg');

  return {
    id: String(row.productId ?? row.favoriteId ?? ''),
    name: String(row.productName ?? 'Product'),
    slug: String(row.productSlug ?? ''),
    price: Number(row.price ?? 0),
    mrp: Number(row.mrp ?? 0),
    images: [{ url: image, isPrimary: true, alt: row.productName ?? 'Product image' }],
    image,
    variants: [],
    stock: Number(row.stock ?? 0),
  };
}

export default function WishlistPageClient() {
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const rows = await fetchWishlistRows();
      if (!mounted || rows.length === 0) {
        if (mounted) setWishlistProducts([]);
        return;
      }

      const enriched = rows.map((row) => mapWishlistFallback(row));

      if (mounted) setWishlistProducts(enriched);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return <WishlistClient wishlistProducts={wishlistProducts} />;
}
