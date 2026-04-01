import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { API_URL } from '@/lib/api';
import ProductPageClient from './ProductPageClient';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const getProductData = cache(async (slug: string) => {
  const product = await prisma.product.findFirst({
    where: {
      status: 'Active',
      OR: [{ slug }, { id: slug }]
    },
    include: {
      images: { orderBy: { order: 'asc' } },
      variants: true,
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  const relatedProducts = product
    ? await prisma.product.findMany({
        where: {
          status: 'Active',
          id: { not: product.id },
          OR: [
            { categoryId: product.categoryId },
            { fabric: product.fabric }
          ]
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { orderBy: { order: 'asc' }, take: 2 },
          variants: true,
        }
      })
    : [];

  return { product, relatedProducts };
});

async function getCoupons() {
  try {
    const res = await fetch(`${API_URL}/api/storefront/discounts`, {
      next: { revalidate: 3600 }
    });
    if (res.ok) return res.json();
    return [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getProductData(slug);

  if (!product) return { title: 'Product Not Found — AARAH' };

  const imageUrl = product.images?.[0]?.url || '/assets/images/fabric-placeholder.jpg';

  return {
    title: `${product.name} — AARAH`,
    description: product.description ?? `Shop ${product.name} at AARAH.`,
    openGraph: {
      title: product.name,
      description: product.description ?? '',
      images: [{ url: imageUrl }],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const [{ product, relatedProducts }, coupons] = await Promise.all([
    Promise.resolve(getProductData(slug)),
    getCoupons(),
  ]);

  if (!product) notFound();

  return (
    <ProductPageClient
      product={product as any}
      relatedProducts={relatedProducts as any}
      initialCoupons={coupons}
    />
  );
}
