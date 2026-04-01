import '@/app/globals.css';
import type { Metadata } from 'next';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import QueryProvider from '@/components/providers/QueryProvider';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://aarah.in'),
  title: 'AARAH — Maternity & Nursing Wear',
  description:
    'Premium maternity and nursing wear crafted for the modern Indian mother. Breathable fabrics, thoughtful silhouettes, discreet feeding access.',
  keywords:
    'maternity wear, nursing wear, feeding kurta, maternity kurti, breastfeeding clothes, India',
  openGraph: {
    title: 'AARAH — Maternity & Nursing Wear',
    description: 'Beautiful through every stage of motherhood.',
    type: 'website',
    url: 'https://aarah.in',
    siteName: 'AARAH',
    images: [
      {
        url: '/assets/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'AARAH — Maternity & Nursing Wear',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AARAH — Maternity & Nursing Wear',
    description: 'Beautiful through every stage of motherhood.',
    images: ['/assets/images/og-image.jpg'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#191919',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <AuthProvider>
          <CartProvider>
            <QueryProvider>
              {children}
            </QueryProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
