import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const whereClause: any = {
      status: 'APPROVED',
    };

    if (productId) {
      whereClause.productId = productId;
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { name: true, slug: true }
        }
      }
    });

    const stats = await prisma.review.aggregate({
      where: productId ? { productId, status: 'APPROVED' } : { status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });

    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: {
        status: 'APPROVED',
        ...(productId ? { productId } : {})
      },
      _count: { rating: true }
    });

    const formattedDistribution = ratingDistribution.map(group => ({
      rating: group.rating,
      count: group._count.rating
    }));

    return NextResponse.json({
      reviews,
      stats: {
        average: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : 0,
        total: stats._count,
        distribution: formattedDistribution
      }
    });
  } catch (error) {
    console.error('[REVIEWS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, rating, content, reviewerName, reviewerEmail } = body;

    if (!productId || !rating || !content || !reviewerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    if (content.length < 10) {
      return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        productId,
        rating: parseInt(rating),
        content,
        reviewerName,
        reviewerDetails: reviewerEmail || null,
        customerEmail: reviewerEmail || null,
        status: 'PENDING',
        approved: false,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully! It will be visible after moderation.',
      review
    }, { status: 201 });

  } catch (error: any) {
    console.error('[REVIEW_SUBMIT_ERROR]', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
