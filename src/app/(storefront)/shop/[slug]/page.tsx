import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import CategoryPageClient from './CategoryPageClient';
import type { Product } from '@/components/ui/ProductCard';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const category = await prisma.category.findUnique({
      where: { slug },
      select: { name: true, description: true, imageUrl: true }
    });

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

  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true }
  });

  if (!category) notFound();

  const PAGE_SIZE = 12;

  const [total, rawProducts] = await Promise.all([
    prisma.product.count({ where: { categoryId: category.id, status: 'Active' } }),
    prisma.product.findMany({
      where: { categoryId: category.id, status: 'Active' },
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
    <CategoryPageClient
      initialProducts={initialProducts}
      initialTotal={total}
      categoryName={category.name}
      categoryId={category.id}
    />
  );
}
