import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { API_URL } from '@/lib/api';
import { extractList, extractTotal, fetchStorefrontCategories } from '@/lib/integrationAdapters';
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

  if (!category) notFound();

  const productsData = await fetch(
    `${API_URL}/api/storefront/products?category=${encodeURIComponent(category.id)}&page=1&pageSize=12`,
    { cache: 'no-store' }
  ).then(async (res) => (res.ok ? await res.json() : { products: [], total: 0 }))
    .catch(() => ({ products: [], total: 0 }));

  const initialProducts: Product[] = extractList<Product>(productsData);
  const total = extractTotal(productsData);

  return (
    <CategoryPageClient
      initialProducts={initialProducts}
      initialTotal={total}
      categoryName={category.name}
      categoryId={category.id}
    />
  );
}
