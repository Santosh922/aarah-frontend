'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile } from '@/types';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  authState: 'loading' | 'authenticated' | 'guest';
  isHydrated: boolean;
  login: (profile: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (!res.ok) return setCurrentUser(null);
        return res.json();
      })
      .then(data => {
        if (data) setCurrentUser(data);
      })
      .catch(() => setCurrentUser(null))
      .finally(() => setIsHydrated(true));
  }, []);

  const login = useCallback((profile: UserProfile) => {
    setCurrentUser(profile);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('aarah_customer_profile');
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, []);

  const authState: 'loading' | 'authenticated' | 'guest' = !isHydrated ? 'loading' : currentUser ? 'authenticated' : 'guest';

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: currentUser !== null, authState, isHydrated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
