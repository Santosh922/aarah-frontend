import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { getCurrentCustomer } from '@/lib/server-auth';
import WishlistClient from './WishlistClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Wishlist — AARAH',
};

export default async function WishlistPage() {
  let wishlistProducts: any[] = [];

  try {
    const auth = await getCurrentCustomer();

    if (auth.authorized && auth.customer) {
      const customer = await prisma.customer.findUnique({
        where: { id: auth.customer.id },
        select: {
          wishlist: {
            where: { status: 'Active' },
            include: {
              images: { orderBy: { order: 'asc' }, take: 2 },
              variants: true,
            },
          },
        },
      });

      if (customer) {
        wishlistProducts = customer.wishlist;
      }
    }
  } catch (e) {
    console.error('[WISHLIST_PAGE_ERROR]', e);
  }

  return <WishlistClient wishlistProducts={wishlistProducts} />;
}
