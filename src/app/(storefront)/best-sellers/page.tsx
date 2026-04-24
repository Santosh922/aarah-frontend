import { API_URL } from '@/lib/api';
import { fetchStorefrontBannersForPosition, pickFirstBannerWithImageUrl } from '@/lib/storefrontBanners';
import { extractProducts, toUiProduct } from '@/lib/productAdapter';
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
        const res = await fetch(`${API_URL}/api/storefront/products?bestSeller=true&page=0&pageSize=1000`, { cache: 'no-store' });
        return res.ok ? res.json() : { products: [] as Product[], total: 0 };
      } catch { return { products: [] as Product[], total: 0 }; }
    })(),
    (async () => {
      try {
        const list = await fetchStorefrontBannersForPosition('best_sellers');
        return pickFirstBannerWithImageUrl(list);
      } catch {
        return null;
      }
    })(),
  ]);

  const apiProducts = extractProducts(productsData);

  return {
    products: apiProducts.map(toUiProduct) as Product[],
    total: apiProducts.length,
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
