import type { Product } from '@/components/ui/ProductCard';

export function getPrimaryImage(product: Product): string {
  if (product.images && product.images.length > 0) {
    return product.images.find(i => i.isPrimary)?.url || product.images[0].url;
  }
  return product.image || '';
}

export function getAvailableSizes(product: Product): string[] {
  if (product.variants && product.variants.length > 0) {
    return product.variants.filter(v => v.stock > 0).map(v => v.size);
  }
  return product.sizes || [];
}
