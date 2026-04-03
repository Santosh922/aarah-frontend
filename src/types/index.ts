// ─── Storefront ───────────────────────────────────────────────────────────────

export interface Address {
  id: number;
  name: string;
  address: string;
  city: string;
  state?: string;
  postalCode: string;
  phone: string;
  email?: string;
}

export interface CartItem {
  id: string;
  variantId?: string;
  sku?: string;
  name: string;
  size: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
}

export interface UserProfile {
  customerId: string;
  name: string;
  phone: string;
  email?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface Variant {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
}

export interface Review {
  id: string;
  reviewerName: string;
  reviewerDetails: string;
  rating: number;
  date: string;
  title: string;
  content: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  url: string;
  price: number;
  mrp: number;
  images: ProductImage[];
  image?: string;
  subtitle?: string;
  description?: string;
  colors?: { name: string; hex: string }[];
  variants: Variant[];
  reviews?: Review[];
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  featured?: boolean;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
}

export interface HeroData {
  backgroundImage: string;
  heading: string;
  subheading: string;
  buttonText: string;
  buttonLink: string;
}

export interface StoreSettings {
  storeName?: string;
  currency?: string;
  email?: string;
  phone?: string;
  address?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
}

export interface InstagramPost {
  id: string;
  imageUrl: string;
  link?: string;
  caption?: string;
}

export interface Coupon {
  code: string;
  type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  value: number;
  desc: string;
  terms?: string;
  minOrderValue?: number;
  appliesTo?: string;
  selectedProductIds?: string[];
  selectedCategoryIds?: string[];
}

export interface ProductsResponse {
  products: Product[];
  total?: number;
  page?: number;
  pageSize?: number;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  /** First letter of name, used in topbars */
  avatar: string;
  email: string;
}
