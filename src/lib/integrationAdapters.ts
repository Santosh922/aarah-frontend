import { API_URL } from '@/lib/api';

export function extractList<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.products)) return payload.products as T[];
  if (Array.isArray(payload?.content)) return payload.content as T[];
  return [];
}

export function extractTotal(payload: any): number {
  if (typeof payload?.total === 'number') return payload.total;
  if (typeof payload?.totalElements === 'number') return payload.totalElements;
  if (Array.isArray(payload?.content)) return payload.content.length;
  if (Array.isArray(payload?.products)) return payload.products.length;
  return 0;
}

export function getClientAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  if (typeof window === 'undefined') return headers;
  const token = localStorage.getItem('aarah_auth_token');
  if (!token) return headers;
  return { ...headers, Authorization: `Bearer ${token}` };
}

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: getClientAuthHeaders((init.headers || {}) as Record<string, string>),
  });
}

export async function safeJson<T = any>(res: Response, fallback: T): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export function unwrapApiResponse<T = any>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

export async function fetchStorefrontCategories(): Promise<Array<{ id: string; name: string; slug: string }>> {
  try {
    const direct = await fetch(`${API_URL}/api/storefront/categories`, { cache: 'no-store' });
    if (direct.ok) {
      const body = await direct.json();
      const rows = extractList<any>(body);
      return rows.map((c) => ({
        id: String(c.id ?? c.slug ?? c.name),
        name: String(c.name ?? 'Category'),
        slug: String(c.slug ?? c.name ?? '').toLowerCase().replace(/\s+/g, '-'),
      }));
    }
  } catch {
    // Fallback below.
  }

  // Fallback: derive categories from product payload category summaries.
  const res = await fetch(`${API_URL}/api/storefront/products?page=0&pageSize=200`, { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json();
  const products = extractList<any>(body);
  const seen = new Map<string, { id: string; name: string; slug: string }>();
  for (const p of products) {
    const c = p?.category;
    if (!c || !c.name) continue;
    const slug = String(c.slug ?? c.name).toLowerCase().replace(/\s+/g, '-');
    if (!seen.has(slug)) {
      seen.set(slug, { id: String(c.id ?? slug), name: String(c.name), slug });
    }
  }
  return Array.from(seen.values());
}

export async function fetchStorefrontBannerById(id: string | number): Promise<any | null> {
  const res = await fetch(`${API_URL}/api/storefront/banners`, { cache: 'no-store' });
  if (!res.ok) return null;
  const banners = extractList<any>(await res.json());
  return banners.find((b) => String(b.id) === String(id)) ?? null;
}
