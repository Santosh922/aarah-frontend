'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';
import type { AdminUser } from '@/types';

export type { AdminUser };

interface UseAdminAuthReturn {
  currentUser: AdminUser | null;
  isMounted: boolean;
  handleLogout: () => Promise<void>;
}

/**
 * useAdminAuth
 *
 * On mount it calls GET /api/auth/admin/me with the httpOnly cookie.
 * - 401  → redirects to /admin/login immediately
 * - ok   → sets currentUser, isMounted = true
 * - network error → redirects to /admin/login
 *
 * handleLogout calls POST /api/auth/admin/logout, clears any legacy
 * localStorage remnants, then redirects to /admin/login.
 *
 * Usage:
 *   const { currentUser, isMounted, handleLogout } = useAdminAuth();
 *   if (!isMounted || !currentUser) return <Spinner />;
 */
export function useAdminAuth(): UseAdminAuthReturn {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/admin/me`, { credentials: 'include' })
      .then(res => {
        if (res.status === 401) {
          window.location.href = '/admin/login';
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        setCurrentUser({
          id:     data.id     ?? 'admin_01',
          name:   data.name   ?? 'Admin',
          avatar: (data.name?.[0] ?? 'A').toUpperCase(),
          email:  data.email  ?? '',
        });
        setIsMounted(true);
      })
      .catch(() => {
        window.location.href = '/admin/login';
      });
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/admin/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best-effort — always redirect even if the request fails
    }
    // Clear any localStorage remnants from the old auth system
    localStorage.removeItem('aarah_admin_session');
    window.location.href = '/admin/login';
  };

  return { currentUser, isMounted, handleLogout };
}
