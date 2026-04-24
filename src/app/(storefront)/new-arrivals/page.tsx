import { API_URL } from '@/lib/api';
import { fetchStorefrontBannersForPosition, pickFirstBannerWithImageUrl } from '@/lib/storefrontBanners';
import { extractProducts, toUiProduct } from '@/lib/productAdapter';
import type { Metadata } from 'next';
import ProductListingClient from '@/components/sections/ProductListingClient';
import type { Product } from '@/components/ui/ProductCard';
import { Sparkles } from 'lucide-react';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'New Arrivals | AARAH',
  description: 'Discover the latest additions to our maternity collection — blending modern aesthetics with unparalleled comfort.',
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
        const res = await fetch(`${API_URL}/api/storefront/products?newArrival=true&page=0&pageSize=1000&sortBy=newest`, { cache: 'no-store' });
        return res.ok ? res.json() : { products: [] as Product[], total: 0 };
      } catch { return { products: [] as Product[], total: 0 }; }
    })(),
    (async () => {
      try {
        const list = await fetchStorefrontBannersForPosition('new_arrivals');
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

export default async function NewArrivalsPage() {
  const { products, total, banner } = await getPageData();

  return (
    <ProductListingClient
      filterKey="newArrival"
      filterValue="true"
      defaultSort="newest"
      initialProducts={products}
      initialTotal={total}
      title="New Arrivals"
      bannerIcon={<Sparkles className="w-3.5 h-3.5" />}
      banner={banner ?? undefined}
    />
  );
}
