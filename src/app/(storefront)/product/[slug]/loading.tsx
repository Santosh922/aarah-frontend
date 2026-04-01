export default function ProductLoading() {
  return (
    <main className="min-h-screen bg-white pt-32 md:pt-40 pb-28 md:pb-20">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 animate-pulse">
          {/* Image skeleton */}
          <div className="w-full aspect-[4/5] bg-gray-200 rounded-sm" />

          {/* Details skeleton */}
          <div className="flex flex-col gap-4 pt-2">
            <div className="h-2.5 bg-gray-200 w-1/4 rounded" />
            <div className="h-8 bg-gray-200 w-3/4 rounded" />
            <div className="h-6 bg-gray-200 w-1/3 rounded mt-2" />

            <div className="flex gap-2 mt-8">
              {['XS', 'S', 'M', 'L', 'XL'].map(s => (
                <div key={s} className="w-12 h-10 bg-gray-200 rounded border border-gray-100" />
              ))}
            </div>

            <div className="h-[52px] bg-gray-200 w-full rounded mt-6" />
            <div className="h-[52px] bg-gray-300 w-full rounded" />
          </div>
        </div>
      </div>
    </main>
  );
}
