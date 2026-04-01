import { API_URL } from '@/lib/api';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import ProductListingClient from '@/components/sections/ProductListingClient';
import type { Product } from '@/components/ui/ProductCard';
import { TrendingUp } from 'lucide-react';

export const revalidate = 300;

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
        const res = await fetch(`${API_URL}/api/storefront/products?bestSeller=true&page=1&pageSize=16&sortBy=featured`, { next: { revalidate: 300 } });
        return res.ok ? res.json() : { products: [] as Product[], total: 0 };
      } catch { return { products: [] as Product[], total: 0 }; }
    })(),
    prisma.banner.findFirst({
      where: { isActive: true, position: 'best_sellers' },
      select: { imageUrl: true, title: true, subtitle: true, buttonText: true, buttonLink: true },
    }).catch(() => null),
  ]);

  return {
    products: productsData.products as Product[],
    total: productsData.total as number,
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
