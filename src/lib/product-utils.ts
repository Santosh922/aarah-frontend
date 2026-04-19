import type { Product } from '@/components/ui/ProductCard';

export function getPrimaryImage(product: Product): string {
  if (product.images && product.images.length > 0) {
    return product.images.find(i => i.isPrimary)?.url || product.images[0].url;
  }
  return product.image || '';
}

export function getAvailableSizes(product: Product): string[] {
  console.log('VARIANT DEBUG:', product.variants);
  if (product.variants && product.variants.length > 0) {
    const rawSizes = product.variants
      .filter(v => Number((v as any).stock ?? (v as any).quantity ?? 0) > 0)
      .map(v => (v as any).size ?? (v as any).sizeName ?? (v as any).label ?? (v as any).value)
      .filter(Boolean);
    return Array.from(new Set(rawSizes));
  }
  return Array.from(new Set(product.sizes || []));
}
