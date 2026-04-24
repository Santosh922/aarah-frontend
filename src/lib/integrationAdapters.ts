import { API_URL } from '@/lib/api';
import { fetchStorefrontBannersForPosition } from '@/lib/storefrontBanners';

export function extractList<T = any>(payload: any): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.products)) return payload.products as T[];
  if (Array.isArray(payload?.content)) return payload.content as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  // eslint-disable-next-line no-console
  console.warn('Unknown response shape:', payload);
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

  const pathname = window.location.pathname || '/';
  const isAdminRoute = pathname.startsWith('/admin');
  const directToken = isAdminRoute
    ? localStorage.getItem('aarah_admin_token')
    : localStorage.getItem('aarah_user_token');

  let token = directToken;
  if (!token) {
    const legacyToken = localStorage.getItem('aarah_auth_token');
    const legacyUserRaw = localStorage.getItem('aarah_auth_user');
    if (legacyToken && legacyUserRaw) {
      try {
        const legacyUser = JSON.parse(legacyUserRaw) as { role?: string };
        const legacyIsAdmin = String(legacyUser?.role ?? '').toUpperCase() === 'ADMIN';
        if ((isAdminRoute && legacyIsAdmin) || (!isAdminRoute && !legacyIsAdmin)) {
          token = legacyToken;
        }
      } catch {
        token = directToken;
      }
    }
  }

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

export async function fetchStorefrontCategories(): Promise<Array<{ id: string; name: string; slug: string; image?: string; children?: Array<{ id: string; name: string; slug: string; image?: string }> }>> {
  const url = `${API_URL}/api/storefront/categories`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    // eslint-disable-next-line no-console
    console.log('RAW CATEGORY RESPONSE:', body);
    const rows = extractList<any>(body);
    const categories = rows.map((c) => ({
      id: String(c?.id ?? ''),
      name: String(c?.name ?? 'Category'),
      slug: String(c?.slug ?? ''),
      image: typeof c?.image === 'string' ? c.image : undefined,
      children: Array.isArray(c?.children)
        ? c.children.map((child: any) => ({
            id: String(child?.id ?? ''),
            name: String(child?.name ?? 'Category'),
            slug: String(child?.slug ?? ''),
            image: typeof child?.image === 'string' ? child.image : undefined,
          }))
        : [],
    })).filter((c) => c.id && c.name && c.slug);
    // eslint-disable-next-line no-console
    console.log('PARSED CATEGORIES:', categories);
    return categories;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('API FAILED:', url, err);
    return [];
  }
}

/** Resolves a story-video banner by id (admin only selects from story_video placements). */
export async function fetchStorefrontBannerById(id: string | number): Promise<any | null> {
  const banners = await fetchStorefrontBannersForPosition('story_video');
  return banners.find((b) => String(b.id) === String(id)) ?? null;
}
