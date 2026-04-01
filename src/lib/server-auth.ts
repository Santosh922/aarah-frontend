import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

export interface CustomerUser {
  id: string;
  customerId: string;
  email: string | null;
  phone: string | null;
  name: string | null;
}

function getRedis() {
  const { Redis } = require('@upstash/redis');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

const ADMIN_TOKEN_TTL = 8 * 60 * 60;

export async function revokeToken(token: string): Promise<void> {
  try {
    const redis = getRedis();
    const decoded = jwt.decode(token) as { jti?: string; exp?: number } | null;
    if (!decoded?.jti) return;
    const ttl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : ADMIN_TOKEN_TTL;
    await redis.set(`revoked:${decoded.jti}`, '1', { ex: ttl > 0 ? ttl : 1 });
  } catch {
    // Redis unavailable — fail silently; cookie expiry is the fallback
  }
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const result = await redis.get(`revoked:${jti}`);
    return result !== null;
  } catch {
    return false;
  }
}

export async function checkAdminAccess(): Promise<{ authorized: boolean; admin?: AdminUser; error?: string }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('aarah_admin_token')?.value;

    if (!token) {
      return { authorized: false, error: 'No authentication token' };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; jti?: string };

    if (decoded.jti && await isTokenRevoked(decoded.jti)) {
      return { authorized: false, error: 'Token has been revoked' };
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true }
    });

    if (!admin) {
      return { authorized: false, error: 'Admin not found' };
    }

    return { authorized: true, admin };
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return { authorized: false, error: 'Invalid or expired token' };
    }
    console.error('[AUTH_ERROR]', error);
    return { authorized: false, error: 'Authentication failed' };
  }
}

function extractTokenFromHeader(request?: Request): string | null {
  if (!request) return null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export async function getCurrentCustomer(request?: Request): Promise<{ authorized: boolean; customer?: CustomerUser; error?: string }> {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get('aarah_customer_token')?.value;
    
    if (!token) {
      const headerToken = extractTokenFromHeader(request);
      if (headerToken) token = headerToken;
    }
    
    if (!token) {
      return { authorized: false, error: 'Not logged in' };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

    const customer = await prisma.customer.findUnique({
      where: { id: decoded.id },
      select: { id: true, customerId: true, email: true, phone: true, name: true }
    });

    if (!customer) {
      return { authorized: false, error: 'Customer not found' };
    }

    return { authorized: true, customer };
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return { authorized: false, error: 'Invalid or expired session' };
    }
    console.error('[CUSTOMER_AUTH_ERROR]', error);
    return { authorized: false, error: 'Authentication failed' };
  }
}
