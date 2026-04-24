'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import type { UserProfile } from '@/types';
import { setApiClientTokenGetter } from '@/lib/apiClient';

interface AuthContextType {
  currentUser: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  authState: 'loading' | 'authenticated' | 'guest';
  isHydrated: boolean;
  setSession: (session: { token: string; user: UserProfile }) => void;
  clearSession: () => void;
  // Temporary compatibility methods for existing UI.
  login: (profile: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_STORAGE_KEY = 'aarah_auth_token';
const USER_STORAGE_KEY = 'aarah_auth_user';
const USER_TOKEN_STORAGE_KEY = 'aarah_user_token';
const USER_USER_STORAGE_KEY = 'aarah_user_user';
const ADMIN_TOKEN_STORAGE_KEY = 'aarah_admin_token';
const ADMIN_USER_STORAGE_KEY = 'aarah_admin_user';

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

function safeReadUser(raw: string | null): UserProfile | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function resolveSessionForPath(pathname: string): { token: string | null; user: UserProfile | null } {
  const adminRoute = isAdminPath(pathname);
  const primaryToken = adminRoute
    ? localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
    : localStorage.getItem(USER_TOKEN_STORAGE_KEY);
  const primaryUserRaw = adminRoute
    ? localStorage.getItem(ADMIN_USER_STORAGE_KEY)
    : localStorage.getItem(USER_USER_STORAGE_KEY);
  const primaryUser = safeReadUser(primaryUserRaw);

  if (primaryToken && primaryUser) {
    return { token: primaryToken, user: primaryUser };
  }

  // Backward compatibility with legacy key/value pair.
  const legacyToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  const legacyUser = safeReadUser(localStorage.getItem(USER_STORAGE_KEY));
  if (!legacyToken || !legacyUser) {
    return { token: null, user: null };
  }

  const legacyIsAdmin = String(legacyUser.role ?? '').toUpperCase() === 'ADMIN';
  if ((adminRoute && legacyIsAdmin) || (!adminRoute && !legacyIsAdmin)) {
    return { token: legacyToken, user: legacyUser };
  }

  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const session = resolveSessionForPath(pathname);
      setToken(session.token);
      setCurrentUser(session.user);
    } catch {
      setToken(null);
      setCurrentUser(null);
    } finally {
      setIsHydrated(true);
    }
  }, [pathname]);

  useEffect(() => {
    setApiClientTokenGetter(() => token);
  }, [token]);

  const setSession = useCallback((session: { token: string; user: UserProfile }) => {
    const isAdmin = String(session.user?.role ?? '').toUpperCase() === 'ADMIN';
    const tokenKey = isAdmin ? ADMIN_TOKEN_STORAGE_KEY : USER_TOKEN_STORAGE_KEY;
    const userKey = isAdmin ? ADMIN_USER_STORAGE_KEY : USER_USER_STORAGE_KEY;

    setToken(session.token);
    setCurrentUser(session.user);
    localStorage.setItem(tokenKey, session.token);
    localStorage.setItem(userKey, JSON.stringify(session.user));
  }, []);

  const clearSession = useCallback(() => {
    const adminRoute = isAdminPath(window.location.pathname);
    setToken(null);
    setCurrentUser(null);

    if (adminRoute) {
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
    } else {
      localStorage.removeItem(USER_TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_USER_STORAGE_KEY);
      localStorage.removeItem('aarah_customer_profile');
    }

    // Backward compatibility cleanup for matching legacy session only.
    const legacyUser = safeReadUser(localStorage.getItem(USER_STORAGE_KEY));
    const legacyIsAdmin = String(legacyUser?.role ?? '').toUpperCase() === 'ADMIN';
    if ((adminRoute && legacyIsAdmin) || (!adminRoute && !legacyIsAdmin)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }

    localStorage.removeItem('aarah_customer_profile');
  }, []);

  const login = useCallback((profile: UserProfile) => {
    // Compatibility for existing components until they migrate to setSession.
    setCurrentUser(profile);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const isAuthenticated = token !== null;
  const authState: 'loading' | 'authenticated' | 'guest' =
    !isHydrated ? 'loading' : isAuthenticated ? 'authenticated' : 'guest';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated,
        authState,
        isHydrated,
        setSession,
        clearSession,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
