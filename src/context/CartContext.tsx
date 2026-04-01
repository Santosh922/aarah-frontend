'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthenticated } = useAuth();

  const syncFavoritesRef = useRef(false);
  const syncAddressesRef = useRef(false);

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

      if (savedCart) setCartItems(JSON.parse(savedCart));
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
      try {
        await fetch(`${API_URL}/api/storefront/cart`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: cartItems }),
        });
      } catch (e) {
        console.error('Cart sync failed', e);
      }
    };

    const timer = setTimeout(sync, 5000);
    return () => clearTimeout(timer);
  }, [cartItems, isAuthenticated, currentUser, isMounted]);

  const doSyncFavorites = useCallback(async () => {
    if (!isAuthenticated || !currentUser?.customerId) return;

    try {
      const res = await fetch(`${API_URL}/api/storefront/wishlist`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.wishlist) {
          setFavorites(prev => {
            const merged = Array.from(new Set([...prev, ...data.wishlist]));
            localStorage.setItem('aarah_favorites', JSON.stringify(merged));
            return merged;
          });
        }
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
      const res = await fetch(`${API_URL}/api/user/addresses`, { credentials: 'include' });
      if (res.ok) {
        const dbAddresses: Address[] = await res.json();
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
        fetch(`${API_URL}/api/user/addresses`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAddr),
        }).then(res => {
          if (res.ok) return res.json();
        })        .then(data => {
          if (data?.id) {
            const updated = prev.map(a => a.id === newId ? { ...a, id: data.id } : a);
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
    setCartItems(prev => {
      const existing = prev.find(
        i => String(i.id) === String(newItem.id) && i.size === newItem.size,
      );
      if (existing) {
        return prev.map(i =>
          String(i.id) === String(newItem.id) && i.size === newItem.size
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i,
        );
      }
      return [...prev, newItem];
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

    setFavorites(prev =>
      prev.includes(sid) ? prev.filter(f => f !== sid) : [...prev, sid],
    );

    if (isAuthenticated && currentUser?.customerId) {
      try {
        const res = await fetch(`${API_URL}/api/storefront/wishlist`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: currentUser.customerId,
            productId: sid,
            action: isFavorited ? 'remove' : 'add'
          })
        });
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
