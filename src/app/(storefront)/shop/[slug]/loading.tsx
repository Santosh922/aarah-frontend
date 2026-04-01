import ProductGridSkeleton from '@/components/ui/ProductGridSkeleton';

export default function CategoryLoading() {
  return (
    <main className="min-h-screen bg-white pt-32 md:pt-40 pb-28 md:pb-20">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-10 w-64 bg-gray-200 mb-6 animate-pulse rounded" />
        <div className="h-6 w-32 bg-gray-100 mb-10 animate-pulse rounded" />
        <ProductGridSkeleton count={12} />
      </div>
    </main>
  );
}
