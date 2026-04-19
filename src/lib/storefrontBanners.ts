import { API_URL } from '@/lib/api';

/**
 * Normalizes GET /api/storefront/banners responses (JSON array or { data: [] }).
 */
export function parseStorefrontBannersPayload(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload !== null && typeof payload === 'object' && 'data' in payload) {
    const d = (payload as { data: unknown }).data;
    if (Array.isArray(d)) return d;
  }
  return [];
}

/**
 * Client-side ordering fallback when backend order is unexpected (uses numeric sortOrder).
 */
export function sortStorefrontBannersBySortOrder(banners: any[]): any[] {
  return [...banners].sort((a, b) => {
    const ao = Number(a?.sortOrder);
    const bo = Number(b?.sortOrder);
    const an = Number.isFinite(ao) ? ao : 0;
    const bn = Number.isFinite(bo) ? bo : 0;
    return an - bn;
  });
}

/**
 * Safe first element for a banner list (handles non-array / empty / sparse).
 */
export function firstStorefrontBanner(list: unknown): any | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const el = list.at(0);
  return el != null ? el : null;
}

/**
 * After sortOrder sort, first banner with a usable image URL (footers, listing heroes).
 */
export function pickFirstBannerWithImageUrl(list: unknown): any | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const sorted = sortStorefrontBannersBySortOrder(list);
  const found = sorted.find((b) => String(b?.imageUrl ?? '').trim() !== '');
  return found ?? null;
}

/**
 * Fetches active banners for a single placement (backend filters by position).
 */
export async function fetchStorefrontBannersForPosition(
  position: string,
  init: RequestInit = {},
): Promise<any[]> {
  const url = `${API_URL}/api/storefront/banners?position=${encodeURIComponent(position)}`;
  try {
    const res = await fetch(url, { cache: 'no-store', ...init });
    if (!res.ok) {
      console.error('[storefrontBanners] HTTP error', {
        position,
        status: res.status,
        statusText: res.statusText,
      });
      return [];
    }
    let payload: unknown;
    try {
      payload = await res.json();
    } catch (parseErr) {
      console.error('[storefrontBanners] JSON parse failed', { position, parseErr });
      return [];
    }
    const parsed = parseStorefrontBannersPayload(payload);
    return sortStorefrontBannersBySortOrder(parsed);
  } catch (err) {
    console.error('[storefrontBanners] fetch failed', { position, err });
    return [];
  }
}
