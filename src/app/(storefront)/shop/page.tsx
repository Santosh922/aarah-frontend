import Link from 'next/link';
import { fetchStorefrontCategories } from '@/lib/integrationAdapters';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  image?: string;
};

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const categories = (await fetchStorefrontCategories()) as CategoryRow[];

  return (
    <main className="min-h-screen bg-white pt-32 md:pt-40 pb-16 md:pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8 md:mb-10">
          <h1 className="font-serif text-3xl md:text-4xl text-primary-dark tracking-wide">
            Categories
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Choose a category to browse products.
          </p>
        </header>

        {categories.length === 0 ? (
          <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            No categories available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/shop/${encodeURIComponent(category.slug)}`}
                className="group block border border-gray-200 rounded-lg overflow-hidden hover:border-gray-400 transition-colors bg-white"
              >
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-44 object-cover"
                    loading="lazy"
                  />
                ) : null}
                <div className="p-4">
                  <h2 className="font-sans text-sm md:text-base font-semibold text-primary-dark group-hover:underline">
                    {category.name}
                  </h2>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
