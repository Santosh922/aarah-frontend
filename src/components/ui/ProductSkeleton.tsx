export default function ProductSkeleton() {
  return (
    <div className="flex flex-col relative w-full animate-pulse">
      <div className="relative w-full aspect-[4/5] bg-gray-200 overflow-hidden" />
      <div className="flex flex-col mt-4 pr-2">
        <div className="h-[17px] md:h-[18px] bg-gray-200 w-3/4 mb-1" />
        <div className="h-3 bg-gray-100 w-full mb-1 mt-1" />
        <div className="h-3 bg-gray-100 w-5/6 mb-3" />
        <div className="flex justify-between items-start mt-1">
          <div className="h-[16px] md:h-[17px] bg-gray-200 w-1/3" />
          <div className="w-11 h-11 md:w-12 md:h-12 bg-gray-200 rounded-full flex-shrink-0" />
        </div>
        <div className="flex gap-2 mt-4 pt-1">
          <div className="h-6 w-16 bg-gray-100 border border-gray-200" />
          <div className="h-6 w-20 bg-gray-100 border border-gray-200" />
        </div>
      </div>
    </div>
  );
}
