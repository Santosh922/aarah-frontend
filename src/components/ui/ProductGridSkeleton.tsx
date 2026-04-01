import ProductSkeleton from './ProductSkeleton';

interface Props {
  count?: number;
}

export default function ProductGridSkeleton({ count = 8 }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-10 md:gap-y-12 w-full">
      {Array.from({ length: count }).map((_, index) => (
        <ProductSkeleton key={index} />
      ))}
    </div>
  );
}
