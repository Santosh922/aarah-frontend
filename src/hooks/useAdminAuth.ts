'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
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
 * Reads admin auth state from shared AuthContext (token + user).
 * - if missing token or non-admin role → redirects to /admin/login
 *
 * handleLogout clears the shared auth session, then redirects.
 *
 * Usage:
 *   const { currentUser, isMounted, handleLogout } = useAdminAuth();
 *   if (!isMounted || !currentUser) return <Spinner />;
 */
export function useAdminAuth(): UseAdminAuthReturn {
  const { currentUser, token, isHydrated, clearSession } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (!isHydrated) return;
    if (!token || !isAdmin) {
      window.location.href = '/admin/login';
    }
  }, [isHydrated, token, isAdmin]);

  const handleLogout = async () => {
    clearSession();
    window.location.href = '/admin/login';
  };

  const mappedAdmin: AdminUser | null = currentUser && isAdmin
    ? {
        id: currentUser.customerId,
        name: currentUser.name,
        avatar: (currentUser.name?.[0] ?? 'A').toUpperCase(),
        email: currentUser.email ?? '',
      }
    : null;

  return { currentUser: mappedAdmin, isMounted: isHydrated, handleLogout };
}
