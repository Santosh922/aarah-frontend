'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);

      setToken(savedToken);
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      } else {
        setCurrentUser(null);
      }
    } catch {
      setToken(null);
      setCurrentUser(null);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    setApiClientTokenGetter(() => token);
  }, [token]);

  const setSession = useCallback((session: { token: string; user: UserProfile }) => {
    setToken(session.token);
    setCurrentUser(session.user);
    localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
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
