import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { API_URL } from '@/lib/api';
import { unwrapApiResponse } from '@/lib/integrationAdapters';
import { extractProducts, filterActiveProducts, toUiProduct } from '@/lib/productAdapter';
import ProductPageClient from './ProductPageClient';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const getProductData = cache(async (slug: string) => {
  const detail = await fetch(`${API_URL}/api/storefront/products/${encodeURIComponent(slug)}`, { cache: 'no-store' })
    .then(async (res) => (res.ok ? await res.json() : null))
    .catch(() => null);

  const detailPayload = unwrapApiResponse<any>(detail);
  const detailBase = detailPayload?.product ?? detailPayload;
  const detailVariants = Array.isArray(detailPayload?.variants) ? detailPayload.variants : [];
  const detailImages = Array.isArray(detailPayload?.images) ? detailPayload.images : [];
  const product = detailBase
    ? toUiProduct({
        ...detailBase,
        variants: detailVariants.length ? detailVariants : detailBase?.variants,
        images: detailImages.length ? detailImages : detailBase?.images,
      })
    : null;

  const relatedProducts = product && product.fabric
    ? await fetch(`${API_URL}/api/storefront/products?fabric=${encodeURIComponent(product.fabric)}&page=0&pageSize=8`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return [];
        const payload = unwrapApiResponse<any>(await res.json());
        return filterActiveProducts(extractProducts(payload)).map(toUiProduct);
      })
      .catch(() => [])
    : [];

  return { product, relatedProducts };
});

async function getCoupons() {
  try {
    const res = await fetch(`${API_URL}/api/storefront/discounts`, {
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const payload = await res.json();
      const unwrapped = unwrapApiResponse<any>(payload);
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(unwrapped)) return unwrapped;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    }
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
