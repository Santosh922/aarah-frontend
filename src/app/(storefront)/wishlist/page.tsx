import { Metadata } from 'next';
import WishlistClient from './WishlistClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Wishlist — AARAH',
};

export default async function WishlistPage() {
  return <WishlistClient wishlistProducts={[]} />;
}
