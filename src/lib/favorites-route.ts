import { API_URL } from '@/lib/api';
import { NextResponse, NextRequest } from 'next/server';

/**
 * POST /api/favorites
 * Proxies favorite toggle to the Spring Boot backend.
 * Forwards the Authorization header from the storefront user's JWT.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, isFavorited } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;

    const res = await fetch(`${API_URL}/api/storefront/favorites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId, isFavorited }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error || 'Failed to update favorites' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Favorites API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
