import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/layout/CartDrawer';
import { API_URL } from '@/lib/api';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let footerBanner = null;
  try {
    const res = await fetch(`${API_URL}/api/storefront/banners?position=footer_promo`, { cache: 'no-store' });
    const banners = res.ok ? await res.json() : [];
    if (banners.length > 0) footerBanner = banners[0];
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
