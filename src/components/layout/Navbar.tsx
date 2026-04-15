'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingBag, User, ArrowRight, Menu, X, ChevronDown, Heart, LogOut } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import ProductCard from '../ui/ProductCard';
import LoginModal from '@/components/modals/LoginModal';
import CartDrawer from '@/components/modals/CartDrawer';

import { API_URL } from '@/lib/api';
import { extractList, fetchStorefrontCategories } from '@/lib/integrationAdapters';
import type { Product } from '../ui/ProductCard';

const TOP_NAV = [
  { name: 'HOME',       href: '/' },
  { name: 'ABOUT',      href: '/about' },
  { name: 'CONTACT US', href: '/contact' },
];

const STATIC_LOWER_NAV = [
  { name: 'BEST-SELLERS', href: '/best-sellers' },
  { name: 'NEW ARRIVALS', href: '/new-arrivals' },
];

interface NavLink {
  name: string;
  href: string;
  dropdown?: { name: string; href: string }[] | null;
}

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();

  const { cartCount, favorites } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { authState, isAuthenticated, currentUser, logout } = useAuth();
  const [categoryDropdown, setCategoryDropdown] = useState<{ name: string; href: string }[]>([]);

  const [isSearchOpen, setIsSearchOpen]       = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching]         = useState(false);
  const [isAuthOpen, setIsAuthOpen]           = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMobileMenus, setExpandedMobileMenus] = useState<string[]>([]);
  const [mounted, setMounted]                 = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetchStorefrontCategories()
      .then((data) => {
        setCategoryDropdown(
          data.map(c => ({
            name: c.name,
            href: `/shop/${c.slug}`,
          }))
        );
      })
      .catch(() => {});
  }, []);

  const LOWER_NAV: NavLink[] = [
    {
      name: 'CATEGORIES',
      href: '/shop',
      dropdown: categoryDropdown.length > 0 ? categoryDropdown : null,
    },
    ...STATIC_LOWER_NAV,
  ];

  // ── FIX: search hits real API, debounced ─────────────────────────────────
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback((q: string) => {
    if (!q.trim()) {
      // Empty query — show featured products as suggestions
      fetch(`${API_URL}/api/storefront/products?featured=true&pageSize=4`)
        .then(r => r.json())
        .then(data => setSearchResults(extractList<Product>(data)))
        .catch(() => setSearchResults([]));
      return;
    }
    setIsSearching(true);
    fetch(`${API_URL}/api/storefront/products?search=${encodeURIComponent(q)}&pageSize=8`)
      .then(r => r.json())
      .then(data => setSearchResults(extractList<Product>(data)))
      .catch(() => setSearchResults([]))
      .finally(() => setIsSearching(false));
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(searchQuery), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery, isSearchOpen, runSearch]);

  // Load suggestions when search panel opens
  useEffect(() => {
    if (isSearchOpen && searchResults.length === 0) runSearch('');
  }, [isSearchOpen]);

  const toggleMobileMenu = (name: string) => {
    setExpandedMobileMenus(prev =>
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  };

  const closeAllMenus = () => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleAccountClick = () => {
    if (authState === 'authenticated') {
      router.push(currentUser?.role === 'ADMIN' ? '/admin' : '/account');
    } else if (authState === 'guest') {
      setIsAuthOpen(true);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const mapProduct = (p: Product) => ({
    ...p,
    id:    p.id?.toString(),
    image: p.images?.find(i => i.isPrimary)?.url || p.images?.[0]?.url || '',
    url:   `/product/${p.slug}`,
  });

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] transition-all duration-300">

      {/* ROW 1: Dark Header */}
      <div className="w-full bg-primary-dark text-white shadow-md relative z-20 border-b border-gray-700">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">

          {/* Mobile: hamburger */}
          <div className="flex-1 lg:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-1 -ml-1 hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-white rounded-sm"
              aria-label="Open menu"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="w-6 h-6" strokeWidth={1.5} />
            </button>
          </div>

          {/* Desktop: top nav links */}
          <div className="hidden lg:flex flex-1 space-x-8">
            {TOP_NAV.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.name} href={link.href} suppressHydrationWarning
                  className={`font-sans text-[11px] font-medium tracking-widest relative group transition-opacity py-1 ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}>
                  {link.name}
                  <span className={`absolute bottom-0 left-0 h-[1px] bg-white transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                </Link>
              );
            })}
          </div>

          {/* Logo */}
          <div className="flex items-center justify-center space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#333] border border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src="/assets/logo.png" alt="AARAH Logo" className="w-5 h-5 sm:w-7 sm:h-7 object-contain" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-serif text-xl sm:text-2xl font-bold leading-none tracking-tight">AARAH</span>
              <span className="font-sans text-[6px] sm:text-[8px] font-light tracking-[0.4em] text-gray-400 uppercase">THAIMAI AADAI</span>
            </div>
          </div>

          {/* Icons */}
          <div className="flex flex-1 items-center justify-end space-x-4 sm:space-x-6">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Search products"
              className="p-3 transition-opacity opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white rounded-sm"
            >
              <Search className="w-5 h-5" strokeWidth={1.5} />
            </button>

            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${mounted && favorites?.length > 0 ? favorites.length + ' items saved' : 'no items saved'}`}
              className="relative p-3 transition-opacity opacity-70 hover:opacity-100"
            >
              <Heart className="w-5 h-5" strokeWidth={1.5} />
              {mounted && favorites?.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm leading-none">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* Account — neutral during loading, login/greeting based on auth state */}
            {authState === 'authenticated' ? (
              <div className="relative group hidden sm:block">
                <button
                  className="p-3 transition-opacity opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white rounded-sm"
                  aria-label="Account menu"
                  aria-haspopup="true"
                >
                  <User className="w-5 h-5" strokeWidth={1.5} />
                </button>
                <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-100 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link href={currentUser?.role === 'ADMIN' ? '/admin' : '/account'} className="block px-4 py-3 text-[11px] font-sans text-gray-700 hover:bg-gray-50 uppercase tracking-widest border-b border-gray-50">
                    My Account
                  </Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-[11px] font-sans text-semantic-error hover:bg-red-50 uppercase tracking-widest flex items-center gap-2">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleAccountClick}
                aria-label="Sign in or create account"
                className="hidden sm:block p-3 transition-opacity opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white rounded-sm"
              >
                <User className="w-5 h-5" strokeWidth={1.5} />
              </button>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              aria-label={`Cart, ${mounted && cartCount > 0 ? cartCount + ' items' : 'empty'}`}
              className="relative p-3 transition-opacity opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white rounded-sm"
            >
              <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
              {mounted && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-gray-100 leading-none">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ROW 2: White main menu — desktop */}
      <div className="hidden lg:block w-full bg-primary-light border-b border-gray-100 relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-center items-center">
          <div className="flex space-x-12">
            {LOWER_NAV.map(link => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <div key={link.name} className="relative group">
                  <Link href={link.href} suppressHydrationWarning
                    className={`font-sans text-[11px] font-bold tracking-[0.3em] transition-colors flex items-center h-full py-2 relative uppercase ${isActive ? 'text-gray-500' : 'text-primary-dark hover:text-gray-500'}`}>
                    {link.name}
                    <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[1px] bg-gray-400 transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                  </Link>
                  {link.dropdown && (
                    <div className="absolute top-full left-0 pt-2 w-64 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 ease-out shadow-xl z-30">
                      <div className="bg-white border border-gray-100 py-2 flex flex-col shadow-lg">
                        {link.dropdown?.map(sub => (
                          <Link key={sub.name} href={sub.href} suppressHydrationWarning
                            className="flex items-center justify-between px-5 py-3.5 text-[12px] font-sans text-gray-600 hover:bg-gray-50 hover:text-primary-dark transition-colors border-b border-gray-50 last:border-0 uppercase tracking-wide">
                            <span>{sub.name}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile slide-out menu */}
      <div className={`fixed inset-0 z-[200] lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeAllMenus} />
        <div className={`absolute top-0 left-0 w-[85%] max-w-sm h-full bg-white shadow-2xl flex flex-col transition-transform duration-500 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-[#FAFAFA]">
            <span className="font-serif text-xl font-bold text-primary-dark">MENU</span>
            <button onClick={closeAllMenus} className="p-2 -mr-2 text-gray-400 hover:text-primary-dark transition-colors"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-6">
            <div className="flex flex-col space-y-1 mb-8">
              {LOWER_NAV.map(link => {
                const hasDropdown = !!link.dropdown;
                const isExpanded = expandedMobileMenus.includes(link.name);
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <div key={link.name} className="flex flex-col border-b border-gray-50 last:border-0 pb-1">
                    {hasDropdown ? (
                      <button onClick={() => toggleMobileMenu(link.name)}
                        className={`flex items-center justify-between py-4 font-sans text-xs font-bold tracking-[0.2em] uppercase transition-colors ${isActive ? 'text-primary-dark' : 'text-gray-600'}`}>
                        <span>{link.name}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    ) : (
                      <Link href={link.href} onClick={closeAllMenus} suppressHydrationWarning
                        className={`py-4 font-sans text-xs font-bold tracking-[0.2em] uppercase transition-colors ${isActive ? 'text-primary-dark' : 'text-gray-600'}`}>
                        {link.name}
                      </Link>
                    )}
                    {hasDropdown && (
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out flex flex-col ${isExpanded ? 'max-h-96 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                        <div className="flex flex-col pl-4 border-l border-gray-200 space-y-4 pt-2">
                          {link.dropdown?.map(sub => (
                            <Link key={sub.name} href={sub.href} onClick={closeAllMenus} suppressHydrationWarning
                              className="font-sans text-[11px] tracking-widest uppercase text-gray-500 hover:text-primary-dark transition-colors">
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col space-y-6 pt-6 border-t border-gray-100">
              <span className="font-sans text-[9px] tracking-[0.2em] text-gray-400 uppercase">Discover</span>
              {TOP_NAV.map(link => (
                <Link key={link.name} href={link.href} onClick={closeAllMenus} suppressHydrationWarning
                  className="font-sans text-[11px] font-medium tracking-widest uppercase text-gray-600 hover:text-primary-dark transition-colors">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 bg-[#FAFAFA]">
            {authState === 'authenticated' ? (
              <div className="flex gap-3">
                <Link href={currentUser?.role === 'ADMIN' ? '/admin' : '/account'} onClick={closeAllMenus}
                  className="flex-1 flex items-center justify-center space-x-2 bg-[#191919] text-white py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase shadow-sm">
                  <User className="w-4 h-4" /><span>My Account</span>
                </Link>
                <button onClick={() => { closeAllMenus(); handleLogout(); }}
                  className="px-4 py-4 border border-gray-200 text-red-500 font-sans text-[11px] font-bold uppercase tracking-widest">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => { closeAllMenus(); setIsAuthOpen(true); }}
                className="w-full flex items-center justify-center space-x-3 bg-[#191919] text-white py-4 font-sans text-[11px] font-bold tracking-[0.2em] uppercase shadow-sm">
                <User className="w-4 h-4" /><span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen search overlay */}
      <div className={`absolute top-full left-0 w-full bg-white shadow-2xl transition-all duration-500 ease-in-out origin-top border-b border-gray-200 z-50 overflow-y-auto max-h-[80vh] ${isSearchOpen ? 'opacity-100 scale-y-100 visible' : 'opacity-0 scale-y-0 invisible'}`}>
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">

          {/* Search input */}
          <div className="flex items-center space-x-4 mb-10 w-full max-w-4xl mx-auto">
            <div className="flex-grow bg-[#F5F5F5] border border-gray-100 px-4 sm:px-5 py-3 sm:py-3.5 flex items-center shadow-inner">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) { router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`); closeAllMenus(); }}}
                className="bg-transparent w-full outline-none text-xs sm:text-sm font-sans text-primary-dark placeholder-gray-400 tracking-wide"
                autoFocus={isSearchOpen}
              />
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin ml-3" />
              ) : searchQuery ? (
                <button onClick={() => setSearchQuery('')}><X className="w-4 h-4 text-gray-400 ml-3 hover:text-red-500 transition-colors" /></button>
              ) : (
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 ml-3" strokeWidth={1.5} />
              )}
            </div>
            <button onClick={closeAllMenus} className="text-[10px] sm:text-xs font-sans text-gray-500 hover:text-primary-dark uppercase tracking-widest px-2 pb-1 border-b border-gray-300">Close</button>
          </div>

          {/* Results */}
          {searchResults.length > 0 ? (
            <>
              <p className="text-center font-sans text-[10px] text-gray-400 tracking-widest uppercase mb-4">
                {searchQuery.trim() ? `Results for "${searchQuery}"` : '✦ Trending Now'}
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 w-full max-w-5xl mx-auto pb-4">
                {searchResults.map(item => (
                  <div key={item.id} onClick={closeAllMenus}>
                    <ProductCard product={mapProduct(item)} variant="wishlist-panel" />
                  </div>
                ))}
              </div>
            </>
          ) : searchQuery && !isSearching ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="w-8 h-8 text-gray-200 mb-4" strokeWidth={1} />
              <p className="font-sans text-xs text-gray-500 tracking-widest uppercase mb-2">
                No results for "{searchQuery}"
              </p>
              <p className="font-sans text-[10px] text-gray-400">
                Try browsing all products
              </p>
              <button
                onClick={() => { router.push('/shop'); closeAllMenus(); }}
                className="mt-6 text-[10px] font-bold text-primary-dark underline underline-offset-4 tracking-widest uppercase"
              >
                Browse All Products
              </button>
            </div>
          ) : null}

        </div>
      </div>

      <LoginModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => { setIsAuthOpen(false); }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </nav>
  );
}
