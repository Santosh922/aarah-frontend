import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'recommended';
    
    const fabrics = searchParams.getAll('fabric');
    const sizes = searchParams.getAll('sizes');
    
    const isBestSeller = searchParams.get('bestSeller') === 'true';
    const isNewArrival = searchParams.get('newArrival') === 'true';
    const isFeatured = searchParams.get('featured') === 'true';

    const idsParam = searchParams.get('ids');
    const idsFilter = idsParam
      ? idsParam.split(',').map(id => id.trim()).filter(Boolean)
      : null;

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const rawPageSize = parseInt(searchParams.get('pageSize') || '40', 10);
    const pageSize = Math.min(100, Math.max(1, rawPageSize));
    const skip = (page - 1) * pageSize;

    const whereClause: Prisma.ProductWhereInput = {
      status: 'Active',
    };

    if (category) {
      whereClause.categoryId = category;
    }

    if (isBestSeller) whereClause.isBestSeller = true;
    if (isNewArrival) whereClause.isNewArrival = true;
    if (isFeatured) whereClause.featured = true;

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { fabric: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (fabrics.length > 0) {
      whereClause.fabric = { in: fabrics };
    }

    if (idsFilter && idsFilter.length > 0) {
      whereClause.id = { in: idsFilter };
    }

    if (sizes.length > 0) {
      whereClause.variants = {
        some: {
          size: { in: sizes },
          stock: { gt: 0 } 
        }
      };
    }

    let orderByClause: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] = { 
      createdAt: 'desc' 
    };

    switch (sortBy) {
      case 'price-low':
        orderByClause = { price: 'asc' };
        break;
      case 'price-high':
        orderByClause = { price: 'desc' };
        break;
      case 'newest':
        orderByClause = { createdAt: 'desc' };
        break;
      case 'recommended':
      default:
        orderByClause = [
          { isBestSeller: 'desc' },
          { createdAt: 'desc' }
        ];
        break;
    }

    const [total, rawProducts] = await Promise.all([
      prisma.product.count({ where: whereClause }),
      prisma.product.findMany({
        where: whereClause,
        orderBy: orderByClause,
        skip,
        take: pageSize,
        include: {
          images: {
            orderBy: { isPrimary: 'desc' },
          },
          variants: true,
        }
      })
    ]);

    const formattedProducts = rawProducts.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      mrp: product.mrp,
      isBestSeller: product.isBestSeller,
      isNewArrival: product.isNewArrival,
      featured: product.featured,
      fabric: product.fabric,
      shortDescription: product.shortDescription || '',
      description: product.description || '',
      tags: product.tags || [],
      categoryId: product.categoryId,
      createdAt: product.createdAt,
      images: product.images.map(img => ({
        id: img.id,
        url: img.url,
        alt: img.alt || product.name,
        isPrimary: img.isPrimary
      })),
      variants: product.variants.map(v => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        stock: v.stock
      }))
    }));

    return NextResponse.json(
      { products: formattedProducts, total },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      }
    );

  } catch (error) {
    console.error('[GET_PRODUCTS_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching products', code: 'INTERNAL_SERVER_ERROR' }, 
      { status: 500 }
    );
  }
}
