import { useQuery } from '@tanstack/react-query';
import { API_URL } from '@/lib/api';

export function useProducts(params: Record<string, string | boolean | number | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }

  return useQuery({
    queryKey: ['products', searchParams.toString()],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/storefront/products?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
