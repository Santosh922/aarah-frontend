import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' blob: data: https://*.supabase.co https://*.supabase.in https://images.unsplash.com https://picsum.photos",
      "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.supabase.co https://*.supabase.in https://*.upstash.io",
      "frame-src https://checkout.razorpay.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ')
  );

  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const adminToken = request.cookies.get('aarah_admin_token')?.value;

    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const secret = new TextEncoder().encode(
        process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || ''
      );
      await jwtVerify(adminToken, secret);
    } catch {
      console.warn('[MIDDLEWARE] Invalid or tampered admin token detected');
      const redirect = NextResponse.redirect(new URL('/admin/login', request.url));
      redirect.cookies.delete('aarah_admin_token');
      return redirect;
    }
  }

  if (pathname.startsWith('/account') || pathname.startsWith('/checkout')) {
    const customerToken = request.cookies.get('aarah_customer_token')?.value;
    if (pathname.startsWith('/account') && !customerToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
