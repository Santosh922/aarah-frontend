import { Metadata } from 'next';
import WishlistPageClient from './WishlistPageClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Wishlist — AARAH',
};

export default async function WishlistPage() {
  return <WishlistPageClient />;
}
