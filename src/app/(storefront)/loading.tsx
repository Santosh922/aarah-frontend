import ProductGridSkeleton from '@/components/ui/ProductGridSkeleton';

export default function HomeLoading() {
  return (
    <main className="min-h-screen bg-primary-light pt-20">
      <div className="w-full h-[80vh] min-h-[500px] bg-gray-200 animate-pulse" />
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="h-8 w-48 bg-gray-200 mb-4 animate-pulse rounded mx-auto" />
        <div className="h-4 w-96 bg-gray-100 mb-16 animate-pulse rounded mx-auto" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="w-full aspect-[4/5] bg-gray-200 mb-4" />
              <div className="h-5 bg-gray-200 w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
