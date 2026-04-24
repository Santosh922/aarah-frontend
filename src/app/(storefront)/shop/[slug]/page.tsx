import Link from 'next/link';
import type { Metadata } from 'next';
import { API_URL } from '@/lib/api';
import { extractTotal, fetchStorefrontCategories } from '@/lib/integrationAdapters';
import { extractProducts, toUiProduct } from '@/lib/productAdapter';
import CategoryPageClient from './CategoryPageClient';
import type { Product } from '@/components/ui/ProductCard';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const categories = await fetchStorefrontCategories();
    const category = (categories as Array<{ id: string; name: string; slug?: string; description?: string }>)
      .find((c) => c.slug === slug);

    if (!category) return { title: 'Collection Not Found — AARAH' };

    return {
      title: `${category.name} — AARAH`,
      description: category.description ?? `Shop the latest ${category.name} collection.`,
    };
  } catch {
    return { title: 'AARAH — Collections' };
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;

  const categories = await fetchStorefrontCategories();
  const category = (categories as Array<{ id: string; name: string; slug?: string }>)
    .find((c) => c.slug === slug);

  if (!category) {
    return (
      <main className="min-h-screen bg-white pt-32 md:pt-40 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-3xl text-primary-dark mb-3">Category not found</h1>
          <p className="text-gray-500 mb-6">The category you are trying to view does not exist.</p>
          <Link
            href="/shop"
            className="inline-block bg-[#191919] text-white px-8 py-3.5 font-sans text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-colors"
          >
            Browse Categories
          </Link>
        </div>
      </main>
    );
  }

  const productsData = await fetch(
    `${API_URL}/api/storefront/products?category=${encodeURIComponent(slug)}&page=0&pageSize=12`,
    { cache: 'no-store' }
  ).then(async (res) => (res.ok ? await res.json() : { products: [], total: 0 }))
    .catch(() => ({ products: [], total: 0 }));

  const initialProducts: Product[] = extractProducts(productsData).map(toUiProduct);
  const total = extractTotal(productsData);

  return (
    <CategoryPageClient
      initialProducts={initialProducts}
      initialTotal={total}
      categoryName={category.name}
      categorySlug={slug}
    />
  );
}
