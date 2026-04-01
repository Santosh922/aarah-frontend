import prisma from '@/lib/prisma';
import HeroSection from "@/components/home/HeroSection";
import StorySection from "@/components/sections/StorySection";
import FabricGrid from "@/components/sections/FabricGrid";
import PromoBento, { FeatureBlocks } from "@/components/sections/PromoBento";
import JourneyBanner from "@/components/sections/JourneyBanner";
import MaternityFavoritesCarousel from "@/components/home/MaternityFavoritesCarousel";
import DualFeaturePost from "@/components/sections/DualFeaturePost";
import SocialFeed from "@/components/sections/SocialFeed";
import TrustBadges from "@/components/sections/TrustBadges";
import HomeFavorites from "@/components/sections/HomeFavorites";

export const revalidate = 300;

export default async function Home() {
  const formattedFeatured = await prisma.product.findMany({
    where: { status: 'Active' },
    take: 8,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      mrp: true,
      shortDescription: true,
      description: true,
      tags: true,
      fabric: true,
      isBestSeller: true,
      isNewArrival: true,
      featured: true,
      images: {
        orderBy: { isPrimary: 'desc' },
        select: { url: true, isPrimary: true, alt: true },
      },
      variants: {
        select: { id: true, size: true, color: true, stock: true },
      },
    }
  }).then(products => products.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    mrp: p.mrp,
    shortDescription: p.shortDescription || '',
    description: p.description || '',
    tags: p.tags || [],
    fabric: p.fabric || undefined,
    isBestSeller: p.isBestSeller,
    isNewArrival: p.isNewArrival,
    featured: p.featured,
    image: p.images.find(img => img.isPrimary)?.url || p.images[0]?.url || '',
    images: p.images.map(img => ({ url: img.url, isPrimary: img.isPrimary, alt: img.alt || '' })),
    variants: p.variants.map(v => ({ id: v.id, size: v.size, color: v.color || '', stock: v.stock })),
  }))).catch(error => {
    console.error('[HOME_FEATURED_PRODUCTS_ERROR]', error);
    return [];
  });

  return (
    <main className="min-h-screen bg-primary-light pt-20">
      <HeroSection />
      <StorySection />
      <FabricGrid />
      <PromoBento />
      <JourneyBanner />
      <MaternityFavoritesCarousel initialProducts={formattedFeatured} />
      <HomeFavorites />
      <DualFeaturePost />
      <FeatureBlocks />
      <SocialFeed />
      <TrustBadges />
    </main>
  );
}
