import { API_URL } from '@/lib/api';
import { extractProducts, filterActiveProducts, toUiProduct } from '@/lib/productAdapter';
import type { Metadata } from 'next';
import ProductListingClient from '@/components/sections/ProductListingClient';
import type { Product } from '@/components/ui/ProductCard';
import { TrendingUp } from 'lucide-react';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Best Sellers | AARAH',
  description: 'Our most-loved maternity and nursing pieces, designed for ultimate comfort and effortless style.',
};

interface ListingBanner {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
}

async function getPageData() {
  const [productsData, banner] = await Promise.all([
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/storefront/products?bestSeller=true&page=1&pageSize=1000`, { cache: 'no-store' });
        return res.ok ? res.json() : { products: [] as Product[], total: 0 };
      } catch { return { products: [] as Product[], total: 0 }; }
    })(),
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/storefront/banners?position=best_sellers`, { cache: 'no-store' });
        const banners = res.ok ? await res.json() : [];
        return banners[0] ?? null;
      } catch {
        return null;
      }
    })(),
  ]);

  return {
    products: filterActiveProducts(extractProducts(productsData)).map(toUiProduct) as Product[],
    total: filterActiveProducts(extractProducts(productsData)).length,
    banner: banner as ListingBanner | null,
  };
}

export default async function BestSellersPage() {
  const { products, total, banner } = await getPageData();

  return (
    <ProductListingClient
      filterKey="bestSeller"
      filterValue="true"
      defaultSort="featured"
      initialProducts={products}
      initialTotal={total}
      title="Best Sellers"
      bannerIcon={<TrendingUp className="w-3.5 h-3.5" />}
      banner={banner ?? undefined}
    />
  );
}
