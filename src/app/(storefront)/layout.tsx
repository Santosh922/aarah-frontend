import prisma from '@/lib/prisma';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/layout/CartDrawer';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let footerBanner = null;
  try {
    const banners = await prisma.banner.findMany({
      where: { position: 'footer_promo', isActive: true },
      take: 1,
    });
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
