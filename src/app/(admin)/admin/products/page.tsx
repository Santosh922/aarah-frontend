import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import ProductClientTable from './ProductClientTable';
import type { AdminUser } from '@/types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? (() => { throw new Error('JWT_SECRET environment variable is not set'); })()
);

async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('aarah_admin_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const adminId = payload.id as string;
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true },
    });
    if (!admin) return null;
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      avatar: admin.name.charAt(0).toUpperCase(),
    };
  } catch {
    return null;
  }
}

export default async function AdminProductsPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { status: 'Active' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      take: 20,
      orderBy: { updatedAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        images: { where: { isPrimary: true }, take: 1 },
        variants: true,
      },
    }),
  ]);

  const statusCounts = products.reduce<Record<string, number>>((acc, p) => {
    const s = p.status as string;
    acc[s] = (acc[s] || 0) + 1;
    acc['All'] = (acc['All'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formattedProducts = products.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description || '',
    shortDescription: p.shortDescription || '',
    sku: p.sku || '',
    categoryId: p.categoryId || '',
    tags: p.tags || [],
    images: p.images.map(img => ({ id: img.id, url: img.url, alt: img.alt || '', isPrimary: img.isPrimary, order: img.order })),
    mrp: p.mrp,
    price: p.price,
    costPrice: p.costPrice || 0,
    gstPercent: p.gstPercent,
    hsnCode: p.hsnCode || '',
    status: p.status as 'Active' | 'Draft' | 'Archived',
    variants: p.variants.map(v => ({ id: v.id, sku: v.sku || '', size: v.size, color: v.color || '', colorHex: v.colorHex || '', stock: v.stock })),
    totalStock: p.totalStock,
    weight: p.fabric || '',
    featured: p.featured,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    category: p.category,
  }));

  return (
    <ProductClientTable
      initialProducts={formattedProducts}
      initialCategories={categories}
      initialTotal={products.length}
      initialStatusCounts={statusCounts}
      currentUser={admin}
    />
  );
}
