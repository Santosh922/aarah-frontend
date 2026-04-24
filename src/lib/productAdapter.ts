import type { Product } from '@/components/ui/ProductCard';
import { API_URL } from '@/lib/api';

export function extractProducts(payload: any): any[] {
  const raw = payload?.data ?? payload;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.products)) return raw.products;
  if (Array.isArray(raw?.content)) return raw.content;
  return [];
}

export function filterActiveProducts(products: any[]): any[] {
  return products.filter((p) => p?.status === 'Active');
}

export function calculateStock(product: any): number {
  const totalStock = Number(product?.totalStock);

  if (!isNaN(totalStock) && totalStock > 0) {
    return totalStock;
  }

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const variantStock = variants.reduce((sum: number, v: any) => {
    return sum + Number(v?.stock ?? v?.quantity ?? 0);
  }, 0);

  return variantStock;
}

export function toUiProduct(raw: any): Product {
  const stock = calculateStock(raw);
  console.log('STOCK DEBUG:', {
    totalStock: raw?.totalStock,
    variants: raw?.variants,
    finalStock: stock,
  });
  const normalizeImageUrl = (value: any): string => {
    const rawUrl = typeof value === 'string' ? value.trim() : '';
    if (!rawUrl) return '';
    if (rawUrl.startsWith('/uploads/')) {
      return `${API_URL}${rawUrl}`;
    }
    return rawUrl;
  };

  const variants = Array.isArray(raw?.variants) ? raw.variants : [];
  const images = Array.isArray(raw?.images)
    ? raw.images.map((img: any, i: number) => ({
        url: normalizeImageUrl(typeof img === 'string' ? img : (img?.url ?? img?.imageUrl ?? '')),
        isPrimary: Boolean(img?.isPrimary),
        alt: img?.alt ?? raw?.name ?? `Product image ${i + 1}`,
      }))
        .filter((img: any) => Boolean(img?.url))
    : [];
  const fallbackImageUrl = normalizeImageUrl(raw?.imageUrl);
  const resolvedImage = images.find((i: any) => i.isPrimary)?.url ?? images[0]?.url ?? fallbackImageUrl;
  const resolvedImages = images.length > 0
    ? images
    : (fallbackImageUrl ? [{ url: fallbackImageUrl, isPrimary: true, alt: raw?.name ?? 'Product image' }] : []);

  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? 'Unnamed Product'),
    slug: String(raw?.slug ?? ''),
    price: Number(raw?.price ?? raw?.mrp ?? 0),
    mrp: Number(raw?.mrp ?? 0),
    images: resolvedImages,
    image: resolvedImage,
    shortDescription: raw?.shortDescription ?? '',
    description: raw?.description ?? '',
    tags: Array.isArray(raw?.tags)
      ? raw.tags
      : (typeof raw?.tags === 'string' ? raw.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
    variants: variants.map((v: any, idx: number) => ({
      id: String(v?.id ?? idx),
      size: String(v?.size ?? ''),
      color: v?.color ?? '',
      stock: Number(v?.stock ?? v?.quantity ?? 0),
      sku: v?.sku ?? '',
    })),
    createdAt: raw?.createdAt,
    isBestSeller: Boolean(raw?.isBestSeller),
    isNewArrival: Boolean(raw?.isNewArrival),
    featured: Boolean(raw?.featured),
    fabric: raw?.fabric ?? '',
    category: raw?.category?.name ?? '',
    stock,
    status: raw?.status ?? '',
  };
}
