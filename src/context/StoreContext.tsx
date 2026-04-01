'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';

interface StoreSettings {
  storeName: string;
  email: string;
  phone: string;
  address: string;
  instagramUrl: string;
  instagramHandle: string;
}

interface StoreContextType {
  settings: StoreSettings;
  loading: boolean;
}

const defaults: StoreSettings = {
  storeName: 'AARAH',
  email: 'support@aarah.in',
  phone: '',
  address: '',
  instagramUrl: 'https://instagram.com',
  instagramHandle: '@aarah',
};

const StoreContext = createContext<StoreContextType>({ settings: defaults, loading: true });

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/settings`, { next: { revalidate: 3600 } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setSettings({
            storeName: data.storeName || defaults.storeName,
            email: data.email || defaults.email,
            phone: data.phone || defaults.phone,
            address: data.address || defaults.address,
            instagramUrl: data.instagramUrl || defaults.instagramUrl,
            instagramHandle: data.instagramHandle || defaults.instagramHandle,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <StoreContext.Provider value={{ settings, loading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreSettings() {
  return useContext(StoreContext);
}
