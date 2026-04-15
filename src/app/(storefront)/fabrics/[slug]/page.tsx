import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { API_URL } from '@/lib/api';
import { extractList, extractTotal } from '@/lib/integrationAdapters';
import FabricsPageClient from './FabricsPageClient';
import type { Product } from '@/components/ui/ProductCard';

export const dynamic = 'force-dynamic';

const FABRIC_LABELS: Record<string, string> = {
  'Cotton': 'Cotton',
  'Mul-Mul': 'Mul Mul',
  'Denim': 'Denim',
  'Hakoba': 'Hakoba',
  'Linen': 'Linen',
  'Georgette': 'Georgette',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const label = FABRIC_LABELS[slug] || decodeURIComponent(slug);
  return {
    title: `${label} Collection — AARAH`,
    description: `Shop our ${label} fabric collection. Soft, breathable, and stylish maternity wear.`,
  };
}

export default async function FabricPage({ params }: PageProps) {
  const { slug } = await params;
  const fabricName = FABRIC_LABELS[slug] || decodeURIComponent(slug);

  const productsData = await fetch(
    `${API_URL}/api/storefront/products?fabric=${encodeURIComponent(fabricName)}&page=1&pageSize=12`,
    { cache: 'no-store' }
  ).then(async (res) => (res.ok ? await res.json() : { products: [], total: 0 }))
    .catch(() => ({ products: [], total: 0 }));

  const initialProducts: Product[] = extractList<Product>(productsData);
  const total = extractTotal(productsData);

  return (
    <FabricsPageClient
      initialProducts={initialProducts}
      initialTotal={total}
      fabricName={fabricName}
    />
  );
}
