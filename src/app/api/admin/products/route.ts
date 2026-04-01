import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';
import { Prisma } from '@prisma/client';
import DOMPurify from 'isomorphic-dompurify';

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substring(2, 6);
}

function sanitizeHTML(str: unknown): string {
  if (typeof str !== 'string') return '';
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

export async function GET(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const category = searchParams.get('category') || searchParams.get('categoryId');
    const fabric = searchParams.get('fabric');
    const sortBy = searchParams.get('sortBy');
    const stockLevel = searchParams.get('stockLevel');
    
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const rawPageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const pageSize = Math.min(100, Math.max(1, rawPageSize));
    const skip = (page - 1) * pageSize;

    const whereClause: Prisma.ProductWhereInput = {};

    if (status && status !== 'All') {
      whereClause.status = status as any;
    }
    if (category && category !== 'All') {
      whereClause.categoryId = category;
    }
    if (fabric && fabric !== 'All') {
      whereClause.fabric = fabric;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }
    if (stockLevel && stockLevel !== 'All') {
      if (stockLevel === 'out_of_stock') {
        whereClause.totalStock = 0;
      } else if (stockLevel === 'low_stock') {
        whereClause.totalStock = { gt: 0, lte: 5 };
      } else if (stockLevel === 'in_stock') {
        whereClause.totalStock = { gt: 5 };
      }
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { updatedAt: 'desc' };
    if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sortBy === 'price_hi') orderBy = { price: 'desc' };
    else if (sortBy === 'price_lo') orderBy = { price: 'asc' };
    else if (sortBy === 'name_az') orderBy = { name: 'asc' };
    else if (sortBy === 'stock_hi') orderBy = { totalStock: 'desc' };

    const [total, products] = await prisma.$transaction(async (tx) => {
      return [
        await tx.product.count({ where: whereClause }),
        await tx.product.findMany({
          where: whereClause,
          orderBy,
          skip,
          take: pageSize,
          include: {
            category: { select: { id: true, name: true } },
            images: { orderBy: { isPrimary: 'desc' } },
            variants: true,
          }
        }),
      ];
    });

    const statusCounts = await prisma.product.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const counts: Record<string, number> = { All: total };
    statusCounts.forEach(sc => {
      counts[sc.status] = (sc._count as Record<string, number>).status || 0;
    });

    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      shortDescription: p.shortDescription || '',
      sku: p.sku || '',
      categoryId: p.categoryId,
      tags: p.tags || [],
      fabric: p.fabric || '',
      images: p.images.map(img => ({
        id: img.id,
        url: img.url,
        alt: img.alt || '',
        isPrimary: img.isPrimary,
        order: img.order,
      })),
      mrp: p.mrp,
      price: p.price,
      costPrice: p.costPrice || 0,
      gstPercent: p.gstPercent,
      hsnCode: p.hsnCode || '',
      status: p.status,
      variants: p.variants.map(v => ({
        id: v.id,
        sku: v.sku || '',
        size: v.size,
        color: v.color || '',
        colorHex: v.colorHex || '',
        stock: v.stock,
      })),
      totalStock: p.totalStock,
      featured: p.featured || false,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      category: p.category,
    }));

    return NextResponse.json({ products: formattedProducts, total, statusCounts: counts }, { status: 200 });

  } catch (error) {
    console.error('[ADMIN_GET_PRODUCTS_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    if (!body.name || !body.price || !body.mrp) {
      return NextResponse.json({ error: 'Name, Price, and MRP are required' }, { status: 400 });
    }

    const slug = body.slug ? sanitizeHTML(body.slug).toLowerCase().replace(/\s+/g, '-') : generateSlug(body.name);
    
    let calculatedTotalStock = body.totalStock || 0;
    if (body.variants && Array.isArray(body.variants)) {
      calculatedTotalStock = body.variants.reduce((acc: number, v: any) => acc + (parseInt(v.stock) || 0), 0);
    }

    const tags = Array.isArray(body.tags)
      ? body.tags.map((t: unknown) => sanitizeHTML(t)).filter(Boolean)
      : [];

    const newProduct = await prisma.$transaction(async (tx) => {
      return await tx.product.create({
        data: {
          name: sanitizeHTML(body.name),
          slug: slug,
          shortDescription: sanitizeHTML(body.shortDescription) || null,
          description: sanitizeHTML(body.description) || null,
          sku: sanitizeHTML(body.sku) || null,
          fabric: sanitizeHTML(body.fabric) || null,
          
          price: parseFloat(body.price),
          mrp: parseFloat(body.mrp),
          costPrice: body.costPrice ? parseFloat(body.costPrice) : null,
          gstPercent: body.gstPercent ? parseFloat(body.gstPercent) : 5,
          hsnCode: sanitizeHTML(body.hsnCode) || null,
          
          isBestSeller: body.isBestSeller || false,
          isNewArrival: body.isNewArrival ?? true,
          featured: body.featured || false,
          status: body.status || 'DRAFT',
          
          totalStock: calculatedTotalStock,
          tags,
          categoryId: body.categoryId || null,

          images: {
            create: body.images?.map((img: any, index: number) => ({
              url: img.url,
              alt: img.alt || body.name,
              isPrimary: img.isPrimary ?? (index === 0)
            })) || []
          },

          variants: {
            create: body.variants?.map((variant: any) => ({
              sku: variant.sku || `${body.sku || slug}-${variant.size}`,
              size: variant.size,
              color: variant.color || null,
              colorHex: variant.colorHex || null,
              stock: parseInt(variant.stock) || 0
            })) || []
          }
        },
        include: {
          images: true,
          variants: true
        }
      });
    }, {
      maxWait: 10000,
      timeout: 20000
    });

    const revalidateSecret = process.env.REVALIDATION_SECRET;
    if (revalidateSecret && newProduct?.slug) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/revalidate?path=/product/${newProduct.slug}`, {
        headers: { 'Authorization': `Bearer ${revalidateSecret}` },
      }).catch(e => console.error('[REVALIDATE_ERROR]', e));
    }

    return NextResponse.json(newProduct, { status: 201 });

  } catch (error: any) {
    console.error('[ADMIN_CREATE_PRODUCT_ERROR]', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: `A product with this ${error.meta?.target?.[0] || 'identifier'} already exists.` 
      }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
