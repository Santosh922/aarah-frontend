import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const { 
      name, slug, description, shortDescription, price, mrp, fabric,
      status, categoryId, tags, images, variants, isBestSeller, isNewArrival, featured
    } = body;

    const formattedTags = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : []);

    let calculatedTotalStock = body.totalStock || 0;
    if (variants && Array.isArray(variants)) {
      calculatedTotalStock = variants.reduce((acc: number, v: any) => acc + (parseInt(v.stock) || 0), 0);
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name,
          slug: slug || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          description: description || '',
          shortDescription: shortDescription || '',
          price: parseFloat(price),
          mrp: mrp ? parseFloat(mrp) : undefined,
          status: status || 'Active',
          categoryId: categoryId || null,
          tags: formattedTags,
          fabric: fabric || null,
          totalStock: calculatedTotalStock,
          isBestSeller: isBestSeller || false,
          isNewArrival: isNewArrival ?? true,
          featured: featured || false,
        },
      });

      if (images && Array.isArray(images)) {
        await tx.image.deleteMany({ where: { productId: id } });
        await tx.image.createMany({
          data: images.map((img: any, index: number) => ({
            productId: id,
            url: img.url,
            alt: img.alt || name,
            isPrimary: img.isPrimary ?? index === 0,
            order: index,
          })),
        });
      }

      if (variants && Array.isArray(variants)) {
        await tx.variant.deleteMany({ where: { productId: id } });
        await tx.variant.createMany({
          data: variants.map((v: any) => ({
            productId: id,
            sku: v.sku || `${slug}-${v.size}`,
            size: v.size,
            color: v.color || null,
            colorHex: v.colorHex || null,
            stock: parseInt(v.stock) || 0,
          })),
        });
      }

      return await tx.product.findUnique({
        where: { id },
        include: { images: true, variants: true }
      });
    }, {
      maxWait: 10000,
      timeout: 20000
    });

    const revalidateSecret = process.env.REVALIDATION_SECRET;
    if (revalidateSecret && updatedProduct?.slug) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/revalidate?path=/product/${updatedProduct.slug}`, {
        headers: { 'Authorization': `Bearer ${revalidateSecret}` },
      }).catch(e => console.error('[REVALIDATE_ERROR]', e));
    }

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    console.error('[PRODUCT_EDIT_ERROR]', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: `A product with this ${error.meta?.target?.[0] || 'identifier'} already exists.` 
      }, { status: 409 });
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update product.' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: true,
        category: { select: { id: true, name: true } }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('[PRODUCT_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.product.delete({ where: { id } });

    const revalidateSecret = process.env.REVALIDATION_SECRET;
    if (revalidateSecret) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/revalidate?path=/shop`, {
        headers: { 'Authorization': `Bearer ${revalidateSecret}` },
      }).catch(e => console.error('[REVALIDATE_ERROR]', e));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PRODUCT_DELETE_ERROR]', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
