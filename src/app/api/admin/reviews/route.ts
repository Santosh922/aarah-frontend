import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const productId = searchParams.get('productId');

    const whereClause: any = {};
    if (status && status !== 'All') {
      whereClause.status = status;
    }
    if (productId) {
      whereClause.productId = productId;
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } }
        }
      }
    });

    const stats = await prisma.review.groupBy({
      by: ['status'],
      _count: true,
    });

    const formattedReviews = reviews.map(review => ({
      id: review.id,
      rating: review.rating,
      content: review.content || 'No text provided',
      reviewerName: review.reviewerName || 'Anonymous Buyer',
      reviewerDetails: review.reviewerDetails || '',
      customerEmail: review.customerEmail || '',
      status: review.status,
      approved: review.approved,
      createdAt: review.createdAt.toISOString(),
      product: review.product ? {
        id: review.product.id,
        name: review.product.name,
        slug: review.product.slug,
        images: review.product.images
      } : null
    }));

    return NextResponse.json({ reviews: formattedReviews, stats });
  } catch (error) {
    console.error('[ADMIN_REVIEWS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, status } = body;

    if (!id) return NextResponse.json({ error: 'Review ID required' }, { status: 400 });

    if (status && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      updateData.approved = status === 'APPROVED';
    }

    const review = await prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } }
      }
    });

    const formattedReview = {
      id: review.id,
      rating: review.rating,
      content: review.content || 'No text provided',
      reviewerName: review.reviewerName || 'Anonymous Buyer',
      reviewerDetails: review.reviewerDetails || '',
      customerEmail: review.customerEmail || '',
      status: review.status,
      approved: review.approved,
      createdAt: review.createdAt.toISOString(),
      product: review.product
    };

    return NextResponse.json(formattedReview);
  } catch (error: any) {
    console.error('[ADMIN_REVIEW_UPDATE_ERROR]', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: 'Review ID required' }, { status: 400 });

    await prisma.review.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN_REVIEW_DELETE_ERROR]', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
