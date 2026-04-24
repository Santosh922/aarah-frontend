'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { authFetch, safeJson, unwrapApiResponse } from '@/lib/integrationAdapters';
import type { Address, CartItem } from '@/types';

interface CartContextType {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;

  cartItems: CartItem[];
  addToCart: (item: CartItem, silent?: boolean) => void;
  removeFromCart: (id: string, size: string) => void;
  updateQuantity: (id: string, size: string, change: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;

  addresses: Address[];
  addAddress: (addr: Omit<Address, 'id'>) => void;
  editAddress: (id: number, addr: Omit<Address, 'id'>) => void;
  removeAddress: (id: number) => void;

  favorites: string[];
  toggleFavorite: (id: string | number) => void;
  syncFavorites: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_IMAGE_PLACEHOLDER = '/assets/images/fabric-placeholder.jpg';

function resolveCartImage(rawImage?: unknown, rawThumbnailImage?: unknown): string {
  const pick = (typeof rawImage === 'string' && rawImage.trim())
    ? rawImage.trim()
    : (typeof rawThumbnailImage === 'string' ? rawThumbnailImage.trim() : '');

  if (!pick) return CART_IMAGE_PLACEHOLDER;
  const lower = pick.toLowerCase();
  if (lower.includes('null') || lower.includes('undefined')) return CART_IMAGE_PLACEHOLDER;

  if (pick.startsWith('http://') || pick.startsWith('https://')) {
    return pick;
  }

  if (pick.startsWith('/assets/')) {
    return pick;
  }

  if (pick.startsWith('/uploads/') || pick.startsWith('uploads/')) {
    const path = pick.startsWith('/') ? pick : `/${pick}`;
    return `${API_URL}${path}`;
  }

  return CART_IMAGE_PLACEHOLDER;
}

function normalizeCartItem(raw: any): CartItem {
  const image = resolveCartImage(raw?.image, raw?.thumbnailImage);

  if (process.env.NODE_ENV !== 'production') {
    console.log('RAW CART ITEM:', raw);
    console.log('FINAL IMAGE:', image);
  }

  return {
    id: String(raw?.id ?? ''),
    variantId: raw?.variantId != null ? String(raw.variantId) : undefined,
    productSlug: typeof raw?.productSlug === 'string' ? raw.productSlug : undefined,
    slug: typeof raw?.slug === 'string' ? raw.slug : undefined,
    sku: typeof raw?.sku === 'string' ? raw.sku : undefined,
    name: String(raw?.name ?? ''),
    size: String(raw?.size ?? ''),
    price: Number(raw?.price ?? 0),
    originalPrice: raw?.originalPrice != null ? Number(raw.originalPrice) : undefined,
    image,
    quantity: Math.max(1, Number(raw?.quantity ?? 1)),
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthenticated } = useAuth();

  const syncFavoritesRef = useRef(false);
  const syncAddressesRef = useRef(false);
  const isSyncingCartRef = useRef(false);
  const lastSyncedSignatureRef = useRef<string>('');

  const [isMounted, setIsMounted] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedCart = localStorage.getItem('aarah_cart');
      const savedAddresses = localStorage.getItem('aarah_addresses');
      const savedFavorites = localStorage.getItem('aarah_favorites');

      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        setCartItems(Array.isArray(parsed) ? parsed.map(normalizeCartItem) : []);
      }
      if (savedAddresses) setAddresses(JSON.parse(savedAddresses));
      if (savedFavorites) {
        const parsed = JSON.parse(savedFavorites);
        setFavorites(parsed.map((id: unknown) => String(id)));
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage', e);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem('aarah_cart', JSON.stringify(cartItems));
    localStorage.setItem('aarah_addresses', JSON.stringify(addresses));
    localStorage.setItem('aarah_favorites', JSON.stringify(favorites));
  }, [cartItems, addresses, favorites, isMounted]);

  useEffect(() => {
    if (!isMounted || !isAuthenticated || !currentUser?.customerId) return;

    const sync = async () => {
      const signature = JSON.stringify(cartItems.map((i) => ({
        id: i.id,
        variantId: i.variantId,
        quantity: i.quantity,
      })));
      if (isSyncingCartRef.current || signature === lastSyncedSignatureRef.current) {
        return;
      }
      isSyncingCartRef.current = true;
      try {
        const res = await authFetch(`${API_URL}/api/storefront/cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: cartItems }),
        });
        if (!res.ok) return;

        const payload = await safeJson<any>(res, {});
        const data = unwrapApiResponse<any>(payload);
        const serverItemsRaw = Array.isArray(data?.items) ? data.items : [];
        if (serverItemsRaw.length === 0) return;

        const normalizedServerItems = serverItemsRaw.map((raw: any) => normalizeCartItem({
          id: raw?.productId ?? raw?.id,
          variantId: raw?.variantId,
          productSlug: raw?.productSlug,
          slug: raw?.productSlug,
          name: raw?.productName ?? raw?.name,
          size: raw?.size,
          price: raw?.price,
          quantity: raw?.quantity,
          image: raw?.image ?? raw?.thumbnailImage,
          thumbnailImage: raw?.thumbnailImage,
        }));

        setCartItems((prev) => {
          const prevKey = JSON.stringify(prev);
          const nextKey = JSON.stringify(normalizedServerItems);
          return prevKey === nextKey ? prev : normalizedServerItems;
        });
        lastSyncedSignatureRef.current = signature;
      } catch (e) {
        console.error('Cart sync failed', e);
      } finally {
        isSyncingCartRef.current = false;
      }
    };

    const timer = setTimeout(sync, 5000);
    return () => clearTimeout(timer);
  }, [cartItems, isAuthenticated, currentUser, isMounted]);

  const doSyncFavorites = useCallback(async () => {
    if (!isAuthenticated || !currentUser?.customerId) return;

    try {
      const res = await authFetch(`${API_URL}/api/storefront/wishlist`);
      if (res.ok) {
        const payload = await safeJson<any>(res, {});
        const data = unwrapApiResponse<any>(payload);
        const wishlist = Array.isArray(data?.wishlist) ? data.wishlist : (Array.isArray(data) ? data.map((w: any) => String(w.productId ?? w.id)) : []);
        console.log('WISHLIST DATA:', data);
        setFavorites(wishlist);
        localStorage.setItem('aarah_favorites', JSON.stringify(wishlist));
      }
    } catch (e) {
      console.error('Failed to sync favorites from database', e);
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.customerId) return;
    if (syncFavoritesRef.current) return;
    syncFavoritesRef.current = true;
    doSyncFavorites();
  }, [isAuthenticated, currentUser, doSyncFavorites]);

  const doSyncAddresses = useCallback(async () => {
    if (!isAuthenticated || !currentUser?.customerId) return;

    try {
      const res = await authFetch(`${API_URL}/api/user/addresses`);
      if (res.ok) {
        const payload = await safeJson<any>(res, {});
        const extractedAddresses = payload?.data?.addresses ?? payload?.data ?? payload;
        const dbAddresses: Address[] = Array.isArray(extractedAddresses) ? extractedAddresses : [];
        setAddresses(prev => {
          const localIds = new Set(prev.map(a => a.id));
          const merged = [...prev];
          for (const dbAddr of dbAddresses) {
            if (!localIds.has(dbAddr.id)) {
              merged.push(dbAddr);
            }
          }
          return merged;
        });
      }
    } catch (e) {
      console.error('Failed to sync addresses from database', e);
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.customerId) return;
    if (syncAddressesRef.current) return;
    syncAddressesRef.current = true;
    doSyncAddresses();
  }, [isAuthenticated, currentUser, doSyncAddresses]);

  const addAddress = useCallback((newAddr: Omit<Address, 'id'>) => {
    setAddresses(prev => {
      const newId = prev.length > 0 ? Math.max(...prev.map(a => a.id)) + 1 : 1;
      const withId = { ...newAddr, id: newId };
      if (isAuthenticated && currentUser?.customerId) {
        authFetch(`${API_URL}/api/user/addresses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAddr),
        }).then(res => {
          if (res.ok) return safeJson<any>(res, {});
        })        .then(data => {
          const savedId = data?.data?.id ?? data?.id;
          if (savedId) {
            const updated = prev.map(a => a.id === newId ? { ...a, id: savedId } : a);
            setAddresses(updated);
            localStorage.setItem('aarah_addresses', JSON.stringify(updated));
          }
        }).catch(() => {});
      }
      return [...prev, withId];
    });
  }, [isAuthenticated, currentUser]);

  const editAddress = useCallback((id: number, updatedAddr: Omit<Address, 'id'>) => {
    setAddresses(prev => prev.map(a => (a.id === id ? { ...updatedAddr, id } : a)));
  }, []);

  const removeAddress = useCallback((id: number) => {
    setAddresses(prev => prev.filter(a => a.id !== id));
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addToCart = useCallback((newItem: CartItem, silent = false) => {
    const safeNewItem = normalizeCartItem(newItem);
    setCartItems(prev => {
      const existing = prev.find(
        i => String(i.id) === String(safeNewItem.id) && i.size === safeNewItem.size,
      );
      if (existing) {
        return prev.map(i =>
          String(i.id) === String(safeNewItem.id) && i.size === safeNewItem.size
            ? { ...i, quantity: i.quantity + safeNewItem.quantity }
            : i,
        );
      }
      return [...prev, safeNewItem];
    });
    if (!silent) setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string, size: string) => {
    setCartItems(prev =>
      prev.filter(i => !(String(i.id) === String(id) && i.size === size)),
    );
  }, []);

  const updateQuantity = useCallback((id: string, size: string, change: number) => {
    setCartItems(prev =>
      prev.map(i =>
        String(i.id) === String(id) && i.size === size
          ? { ...i, quantity: Math.max(1, i.quantity + change) }
          : i,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const toggleFavorite = useCallback(async (id: string | number) => {
    const sid = String(id);
    const isFavorited = favorites.includes(sid);
    const previous = favorites;
    const updated = isFavorited ? previous.filter((f) => f !== sid) : [...previous, sid];

    setFavorites(updated);

    if (isAuthenticated && currentUser?.customerId) {
      if (String(currentUser?.role ?? '').toUpperCase() !== 'USER') {
        console.warn('Skipping wishlist API for non-user session');
        setFavorites(previous);
        localStorage.setItem('aarah_favorites', JSON.stringify(previous));
        return;
      }
      try {
        const res = isFavorited
          ? await authFetch(`${API_URL}/api/storefront/favorites/${sid}`, {
              method: 'DELETE',
            })
          : await authFetch(`${API_URL}/api/storefront/favorites`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: Number(sid) }),
            });
        const responsePayload = await safeJson<any>(res, null);
        console.log('FAVORITE API RESPONSE:', responsePayload);
        if (!res.ok) throw new Error('Wishlist sync failed');
      } catch (e) {
        console.error('Failed to sync wishlist to database', e);
        setFavorites(previous);
        localStorage.setItem('aarah_favorites', JSON.stringify(previous));
      }
    }
  }, [favorites, isAuthenticated, currentUser]);

  const cartCount = useMemo(
    () => cartItems.reduce((t, i) => t + i.quantity, 0),
    [cartItems],
  );
  const cartTotal = useMemo(
    () => cartItems.reduce((t, i) => t + i.price * i.quantity, 0),
    [cartItems],
  );

  const syncFavorites = useCallback(async () => {
    if (isAuthenticated && currentUser?.customerId) {
      await doSyncFavorites();
    }
  }, [isAuthenticated, currentUser, doSyncFavorites]);

  const value = useMemo(
    () => ({
      isCartOpen, openCart, closeCart,
      cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal,
      addresses, addAddress, editAddress, removeAddress,
      favorites, toggleFavorite, syncFavorites,
    }),
    [
      isCartOpen, openCart, closeCart,
      cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal,
      addresses, addAddress, editAddress, removeAddress,
      favorites, toggleFavorite, syncFavorites,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}

export type { Address, CartItem };
