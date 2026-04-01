import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const { identifier } = await params;

    const product = await prisma.product.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [
          { id: identifier },
          { slug: identifier }
        ]
      },
      include: {
        images: {
          orderBy: { isPrimary: 'desc' }
        },
        variants: true,
        reviews: {
          where: { approved: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const formattedProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      price: product.price,
      mrp: product.mrp,
      isBestSeller: product.isBestSeller,
      isNewArrival: product.isNewArrival,
      fabric: product.fabric,
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
        colorHex: v.colorHex,
        stock: v.stock
      })),
      reviews: product.reviews
    };

    return NextResponse.json(formattedProduct, { status: 200 });

  } catch (error) {
    console.error('[GET_SINGLE_PRODUCT_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching product details' },
      { status: 500 }
    );
  }
}
