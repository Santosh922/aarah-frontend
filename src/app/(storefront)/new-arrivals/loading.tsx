import ProductGridSkeleton from '@/components/ui/ProductGridSkeleton';

export default function NewArrivalsLoading() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-32 md:pt-40 pb-20">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="w-full h-[350px] md:h-[450px] bg-gray-200 animate-pulse rounded-none" />
      </div>
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-4 w-32 bg-gray-200 mb-8 animate-pulse rounded" />
        <ProductGridSkeleton count={16} />
      </div>
    </main>
  );
}
