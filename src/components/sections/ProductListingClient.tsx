'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, ArrowDownUp, X, Check } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import ProductGridSkeleton from '@/components/ui/ProductGridSkeleton';
import { API_URL } from '@/lib/api';
import type { Product } from '@/components/ui/ProductCard';

const DEFAULT_FABRICS = ['Cotton', 'Mul Mul', 'Denim', 'Hakoba', 'Linen', 'Georgette'];
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

interface SortOption { id: string; label: string; }

interface ListingBanner {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
}

interface ProductListingClientProps {
  filterKey: string;
  filterValue: string;
  defaultSort: string;
  initialProducts: Product[];
  initialTotal: number;
  title: string;
  subtitle?: string;
  bannerIcon?: React.ReactNode;
  banner?: ListingBanner;
}

const SORT_OPTIONS: SortOption[] = [
  { id: 'featured',   label: 'Featured' },
  { id: 'newest',    label: 'Newest First' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high',label: 'Price: High to Low' },
];

function ProductListingContent({
  filterKey,
  filterValue,
  defaultSort,
  initialProducts,
  initialTotal,
  title,
  subtitle,
  bannerIcon,
  banner,
}: ProductListingClientProps) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set([1]));
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState(defaultSort);
  const [fabricOptions, setFabricOptions] = useState<string[]>(DEFAULT_FABRICS);
  const [sizeOptions, setSizeOptions] = useState<string[]>(DEFAULT_SIZES);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);

  const PAGE_SIZE = 16;

  const fetchPage = useCallback(async (page: number) => {
    const params = new URLSearchParams();
    params.set(filterKey, filterValue);
    if (searchQuery) params.set('search', searchQuery);
    if (sortBy !== defaultSort) params.set('sortBy', sortBy);
    selectedFabrics.forEach(f => params.append('fabric', f));
    selectedSizes.forEach(s => params.append('sizes', s));
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));

    const res = await fetch(`${API_URL}/api/storefront/products?${params}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  }, [filterKey, filterValue, searchQuery, sortBy, defaultSort, selectedFabrics, selectedSizes]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setFetchedPages(new Set([1]));
    setCurrentPage(1);
    try {
      const data = await fetchPage(1);
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Listing fetch error:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    fetch(`${API_URL}/api/storefront/fabrics`)
      .then(r => r.ok ? r.json() : [])
      .then((fabrics: string[]) => {
        if (Array.isArray(fabrics) && fabrics.length > 0) {
          setFabricOptions(fabrics);
        }
      })
      .catch(() => {});

    fetch(`${API_URL}/api/storefront/sizes`)
      .then(r => r.ok ? r.json() : [])
      .then((sizes: string[]) => {
        if (Array.isArray(sizes) && sizes.length > 0) {
          setSizeOptions(sizes);
        }
      })
      .catch(() => {});
  }, []);

  const handleLoadMore = async () => {
    const nextPage = currentPage + 1;
    if (fetchedPages.has(nextPage)) return;
    setIsLoadingMore(true);
    try {
      const data = await fetchPage(nextPage);
      setProducts(prev => [...prev, ...(data.products || [])]);
      setFetchedPages(prev => new Set([...prev, nextPage]));
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleFabric = (fabric: string) =>
    setSelectedFabrics(prev => prev.includes(fabric) ? prev.filter(f => f !== fabric) : [...prev, fabric]);

  const toggleSize = (size: string) =>
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);

  useEffect(() => {
    setSelectedSizes([]);
    setSortBy(defaultSort);
  }, [searchQuery, defaultSort]);

  useEffect(() => {
    if (isMobileFilterOpen || isMobileSortOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileFilterOpen, isMobileSortOpen]);

  const activeFilters = selectedFabrics.length + selectedSizes.length;

  return (
    <>
      {/* Hero banner — extra top padding clears fixed navbar */}
      <div className="w-full pt-32 md:pt-40">
        <div className="relative w-full h-[300px] overflow-hidden isolate">

          {/* Layer 1 — Banner image (bottom) */}
          {banner?.imageUrl ? (
            <img
              src={banner.imageUrl}
              alt={banner.title || title}
              className="absolute inset-0 w-full h-full object-cover -z-10"
            />
          ) : (
            <div className="absolute inset-0 bg-gray-900 -z-10" />
          )}

          {/* Layer 2 — Dark overlay */}
          <div className="absolute inset-0 bg-black/40 z-0" />

          {/* Layer 3 — Text content (top) */}
          <div className="relative z-20 w-full h-full flex flex-col items-center justify-center text-center px-4">
            {bannerIcon && (
              <div className="inline-flex items-center justify-center space-x-2 bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full mb-6 border border-white/30">
                {bannerIcon}
                <span className="font-sans text-[9px] font-bold tracking-widest uppercase">
                  {banner?.subtitle || (title === 'New Arrivals' ? 'Freshly Crafted For You' : 'Loved by Mothers Everywhere')}
                </span>
              </div>
            )}
            <h1 className="font-serif text-4xl md:text-5xl mb-4 tracking-wide">{banner?.title || title}</h1>
            <p className="font-sans text-xs md:text-sm text-white/90 tracking-wide leading-relaxed">
              {banner?.subtitle || (title === 'New Arrivals'
                ? 'Discover the latest additions to our maternity and nursing collection — designed for comfort, style, and confidence.'
                : 'Our most-loved maternity and nursing pieces — designed for ultimate comfort and effortless style.')}
            </p>
            {banner?.buttonText && banner?.buttonLink && (
              <a href={banner.buttonLink}
                className="inline-block mt-6 bg-white text-gray-900 px-8 py-3 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-100 transition-colors">
                {banner.buttonText}
              </a>
            )}
          </div>

        </div>
      </div>

      {/* Content with sidebar layout */}
      <div className="bg-white pb-28 md:pb-20">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-10">

          {/* Desktop Sidebar — Size Filter */}
          <aside className="hidden md:flex w-[220px] flex-shrink-0 flex-col sticky top-32 h-fit max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-thin pr-2">
            <div className="pb-6 border-b border-gray-200 mb-6 flex justify-between items-center">
              <span className="font-sans text-[11px] font-bold text-gray-500 tracking-widest uppercase">
                {isLoading ? '...' : `${total} Products`}
              </span>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setSelectedSizes([]); setSelectedFabrics([]); }}
                  className="text-[9px] uppercase tracking-widest text-primary-dark underline underline-offset-4"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Size Filter */}
            <div className="pb-6">
              <h3 className="font-sans text-xs font-bold tracking-widest text-primary-dark uppercase mb-4">Size</h3>
              <div className="grid grid-cols-4 gap-2">
                {sizeOptions.map(size => (
                  <button key={size} onClick={() => toggleSize(size)}
                    className={`h-9 flex items-center justify-center font-sans text-[10px] uppercase transition-colors border ${selectedSizes.includes(size) ? 'bg-[#F9F9F9] border-gray-400 font-bold text-primary-dark' : 'border-gray-100 text-gray-500 hover:border-gray-300 bg-white'}`}>
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Fabric Filter in Sidebar */}
            <div className="pb-6">
              <h3 className="font-sans text-xs font-bold tracking-widest text-primary-dark uppercase mb-4">Fabric</h3>
              <div className="flex flex-col gap-2">
                {fabricOptions.map(fabric => (
                  <button key={fabric} onClick={() => toggleFabric(fabric)}
                    className={`flex items-center gap-2 px-3 py-2 rounded text-[11px] font-medium border transition-all ${selectedFabrics.includes(fabric) ? 'bg-[#191919] border-[#191919] text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                    {fabric}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <section className="flex-1">

            {/* Sticky sort bar */}
            <div className="sticky top-32 md:top-40 z-30 bg-white pb-0 md:pb-4 border-b border-gray-200 mb-0">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-0">

                {/* Breadcrumb + Title (desktop) */}
                <div className="mb-3 md:mb-0">
                  <div className="hidden md:block font-sans text-[10px] text-gray-400 tracking-widest uppercase mb-2">
                    <Link href="/" className="hover:text-primary-dark transition-colors">Home</Link>
                    <span className="mx-2">/</span>
                    <span>{title}</span>
                  </div>
                  <h2 className="hidden md:block font-serif text-2xl md:text-3xl text-primary-dark tracking-wide">{title}</h2>
                  <span className="md:hidden font-sans text-[11px] text-gray-500 tracking-widest uppercase mt-2 block">
                    {isLoading ? 'Loading...' : `${total} Products`}
                  </span>
                </div>

                {/* Desktop Sort */}
                <div className="hidden md:block relative">
                  <div className="flex items-center space-x-3">
                    <span className="font-sans text-[10px] font-bold text-gray-400 tracking-widest uppercase">Sort By:</span>
                    <button onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                      className="flex items-center space-x-2 font-sans text-[11px] font-bold tracking-widest uppercase text-primary-dark outline-none cursor-pointer py-2 hover:opacity-70 transition-opacity">
                      <span>{SORT_OPTIONS.find(o => o.id === sortBy)?.label}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {isSortDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsSortDropdownOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 shadow-lg z-40 flex flex-col py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {SORT_OPTIONS.map(option => (
                          <button key={option.id} onClick={() => { setSortBy(option.id); setIsSortDropdownOpen(false); }}
                            className={`text-left px-5 py-3.5 font-sans text-[10px] uppercase tracking-widest transition-colors flex justify-between items-center hover:bg-gray-50 ${sortBy === option.id ? 'font-bold text-primary-dark' : 'text-gray-500'}`}>
                            <span>{option.label}</span>
                            {sortBy === option.id && <Check className="w-3.5 h-3.5 text-primary-dark" strokeWidth={2.5} />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Fabric pills — mobile + tablet */}
              <div className="md:hidden">
                <div className="flex items-center gap-3 py-3 border-t border-gray-100 overflow-x-auto hide-scrollbar -mx-4 px-4">
                  {fabricOptions.map(fabric => (
                    <button key={fabric} onClick={() => toggleFabric(fabric)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all ${selectedFabrics.includes(fabric) ? 'bg-[#191919] border-[#191919] text-white' : 'bg-white border-gray-200 text-gray-500'}`}>
                      {fabric}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Product Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 mt-6">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex flex-col">
                    <div className="w-full aspect-[4/5] bg-gray-200 mb-4" />
                    <div className="h-3 bg-gray-200 w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 w-1/4" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center border border-gray-100 bg-[#F9F9F9] mt-6">
                <p className="font-sans text-[11px] text-gray-400 tracking-widest uppercase mb-6">No products found.</p>
                <Link href="/shop" className="bg-[#191919] text-white px-8 py-3.5 font-sans text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors">
                  Browse All Products
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-x-4 md:gap-x-6 gap-y-10 mt-6 relative z-10">
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {total > products.length && (
                  <div className="mt-12 flex flex-col items-center gap-4">
                    <p className="font-sans text-[10px] text-gray-500 tracking-widest uppercase">
                      Showing {products.length} of {total} Products
                    </p>
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="px-12 py-4 bg-[#191919] text-white font-sans text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors disabled:opacity-50"
                    >
                      {isLoadingMore ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* Mobile Filter/Sort Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-gray-200 pb-8 pt-4 px-2 shadow-lg">
        <div className="flex justify-around items-center">
          <button onClick={() => setIsMobileSortOpen(true)} className="flex-1 flex justify-center items-center space-x-2 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-primary-dark">
            <ArrowDownUp className="w-4 h-4" strokeWidth={1.5} /><span>Sort</span>
          </button>
          <div className="w-[1px] h-6 bg-gray-300 mx-2" />
          <button onClick={() => setIsMobileFilterOpen(true)} className="flex-1 flex justify-center items-center space-x-2 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-primary-dark relative">
            <span>Filter</span>
            {activeFilters > 0 && <span className="absolute top-0 right-[25%] w-2 h-2 bg-red-500 rounded-full border border-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Sort Sheet */}
      {isMobileSortOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileSortOpen(false)} />
          <div className="relative bg-white w-full rounded-t-2xl flex flex-col pt-4 pb-10 px-6 animate-in slide-in-from-bottom-full duration-300">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <h2 className="font-serif text-2xl text-primary-dark mb-6 tracking-wide">Sort By</h2>
            <div className="flex flex-col space-y-4">
              {SORT_OPTIONS.map(option => (
                <button key={option.id} onClick={() => { setSortBy(option.id); setIsMobileSortOpen(false); }}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-lg active:bg-gray-50">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-widest text-primary-dark">{option.label}</span>
                  {sortBy === option.id && <Check className="w-4 h-4 text-primary-dark" strokeWidth={2} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Sheet */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)} />
          <div className="relative bg-white w-full h-[80vh] rounded-t-2xl flex flex-col pt-4 animate-in slide-in-from-bottom-full duration-300">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 flex-shrink-0" />
            <div className="flex justify-between items-center px-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-serif text-2xl text-primary-dark tracking-wide">Filters</h2>
              <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* Size */}
              <div className="mb-8">
                <h3 className="font-sans text-xs font-bold tracking-widest text-primary-dark uppercase mb-4">Size</h3>
                <div className="grid grid-cols-4 gap-3">
                  {sizeOptions.map(size => (
                    <button key={size} onClick={() => toggleSize(size)}
                      className={`h-10 rounded-md flex items-center justify-center font-sans text-xs uppercase transition-colors border ${selectedSizes.includes(size) ? 'bg-[#F9F9F9] border-gray-400 font-bold text-primary-dark' : 'border-gray-200 text-gray-500'}`}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              {/* Fabric */}
              <div className="mb-8">
                <h3 className="font-sans text-xs font-bold tracking-widest text-primary-dark uppercase mb-4">Fabric</h3>
                <div className="flex flex-col space-y-3">
                  {fabricOptions.map((fabric: string) => (
                    <div key={fabric} onClick={() => toggleFabric(fabric)} className="flex items-center gap-3 cursor-pointer">
                      <div className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors ${selectedFabrics.includes(fabric) ? 'bg-[#191919] border-[#191919]' : 'border-gray-300'}`}>
                        {selectedFabrics.includes(fabric) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </div>
                      <span className="font-sans text-[13px] text-gray-600">{fabric}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex space-x-3 bg-white pb-8 flex-shrink-0">
              <button onClick={() => { setSelectedFabrics([]); setSelectedSizes([]); }}
                className="flex-1 py-4 border border-gray-200 font-sans text-[11px] font-bold tracking-widest uppercase text-gray-500 rounded-lg">
                Clear All
              </button>
              <button onClick={() => setIsMobileFilterOpen(false)}
                className="flex-[2] py-4 bg-[#191919] text-white font-sans text-[11px] font-bold tracking-widest uppercase rounded-lg shadow-md">
                Show {total} Items
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ProductListingClient(props: ProductListingClientProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white pt-32 md:pt-40">
        <div className="w-full h-[300px] bg-gray-900" />
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    }>
      <ProductListingContent {...props} />
    </Suspense>
  );
}
