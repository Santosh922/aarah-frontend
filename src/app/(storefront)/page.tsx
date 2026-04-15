import { API_URL } from '@/lib/api';
import { extractProducts, filterActiveProducts, toUiProduct } from '@/lib/productAdapter';
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
  const formattedFeatured = await fetch(`${API_URL}/api/storefront/products?featured=true&page=1&pageSize=8`, { cache: 'no-store' })
    .then(async (res) => {
      if (!res.ok) return [];
      const payload = await res.json();
      return filterActiveProducts(extractProducts(payload)).map(toUiProduct);
    })
    .catch(() => []);

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
