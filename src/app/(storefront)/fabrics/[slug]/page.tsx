import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
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

  const PAGE_SIZE = 12;

  const [total, rawProducts] = await prisma.$transaction([
    prisma.product.count({ where: { fabric: fabricName, status: 'Active' } }),
    prisma.product.findMany({
      where: { fabric: fabricName, status: 'Active' },
      take: PAGE_SIZE,
      orderBy: [{ isBestSeller: 'desc' }, { createdAt: 'desc' }],
      include: {
        images: { orderBy: { isPrimary: 'desc' } },
        variants: true,
      }
    })
  ]);

  const initialProducts: Product[] = rawProducts.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    mrp: p.mrp,
    shortDescription: p.shortDescription || '',
    isBestSeller: p.isBestSeller,
    isNewArrival: p.isNewArrival,
    featured: p.featured,
    fabric: p.fabric || undefined,
    tags: p.tags || [],
    categoryId: p.categoryId,
    images: p.images.map(img => ({
      id: img.id,
      url: img.url,
      alt: img.alt || p.name,
      isPrimary: img.isPrimary
    })),
    variants: p.variants.map(v => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color ?? undefined,
      stock: v.stock
    }))
  }));

  return (
    <FabricsPageClient
      initialProducts={initialProducts}
      initialTotal={total}
      fabricName={fabricName}
    />
  );
}
