import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/layout/CartDrawer';
import { fetchStorefrontBannersForPosition, pickFirstBannerWithImageUrl } from '@/lib/storefrontBanners';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let footerBanner = null;
  try {
    const list = await fetchStorefrontBannersForPosition('footer_promo');
    footerBanner = pickFirstBannerWithImageUrl(list);
  } catch {}

  return (
    <div className="storefront-layout flex flex-col min-h-screen relative">
      <Navbar />
      <CartDrawer />
      <main className="flex-grow">
        {children}
      </main>
      <Footer footerBanner={footerBanner} />
    </div>
  );
}
