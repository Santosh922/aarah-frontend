'use client';

import { useState, useEffect } from 'react';
import { Star, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  content: string;
  reviewerName: string;
  reviewerDetails?: string;
  createdAt: string;
}

interface ProductReviewsProps {
  productId: string;
  productName?: string;
  initialReviews?: Review[];
  initialStats?: { average: number; total: number; distribution: { rating: number; count: string }[] };
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizes = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizes} ${
            star <= rating ? 'fill-[#ffc107] text-[#ffc107]' : 'fill-transparent text-gray-300'
          }`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export default function ProductReviews({ productId, productName, initialReviews, initialStats }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews || []);
  const [loading, setLoading] = useState(!initialReviews);
  const [stats, setStats] = useState(initialStats || { average: 0, total: 0, distribution: [] as { rating: number; count: string }[] });
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (initialReviews && initialReviews.length >= 0) return;
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/storefront/reviews?productId=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setStats(data.stats || { average: 0, total: 0, distribution: [] });
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleReview = (id: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedReviews(newExpanded);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDistributionPercent = (rating: number) => {
    if (stats.total === 0) return 0;
    const distItem = stats.distribution.find((d: any) => Number(d.rating) === rating);
    return distItem ? (Number(distItem.count) / stats.total) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <div className="text-center py-12 border-t border-b border-gray-100">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
        </div>
        <p className="font-sans text-sm text-gray-500 mb-1">No reviews yet</p>
        <p className="font-sans text-xs text-gray-400">Be the first to review {productName}</p>
      </div>
    );
  }

  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-6 bg-[#FAFAFA] rounded-xl">
          <span className="font-serif text-5xl text-primary-dark mb-2">{stats.average}</span>
          <StarDisplay rating={Math.round(stats.average)} size="md" />
          <span className="font-sans text-xs text-gray-500 mt-2 tracking-widest uppercase">
            Based on {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
          </span>
        </div>

        <div className="md:col-span-8 flex flex-col justify-center space-y-2">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-3">
              <span className="font-sans text-xs text-gray-600 w-12">{star} Star</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ffc107] rounded-full transition-all duration-500"
                  style={{ width: `${getDistributionPercent(star)}%` }}
                />
              </div>
              <span className="font-sans text-xs text-gray-400 w-8 text-right">
                {Math.round(getDistributionPercent(star))}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-6">
        {displayedReviews.map((review) => {
          const isExpanded = expandedReviews.has(review.id);
          const isLong = review.content.length > 200;

          return (
            <div
              key={review.id}
              className="border-b border-gray-100 pb-6 last:border-0 last:pb-0"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary-dark text-white flex items-center justify-center font-sans text-xs font-bold flex-shrink-0">
                  {getInitials(review.reviewerName)}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="font-sans text-sm font-bold text-primary-dark">
                      {review.reviewerName}
                    </span>
                    <StarDisplay rating={review.rating} />
                    <span className="font-sans text-xs text-gray-400">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>

                  {/* Content */}
                  <div>
                    <p className={`font-sans text-sm text-gray-700 leading-relaxed ${!isExpanded && isLong ? 'line-clamp-2' : ''}`}>
                      {review.content}
                    </p>
                    {isLong && (
                      <button
                        onClick={() => toggleReview(review.id)}
                        className="font-sans text-xs font-bold text-primary-dark mt-1 flex items-center gap-1 hover:text-gray-600 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            Show less <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            Read more <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More */}
      {reviews.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-3 border border-gray-200 rounded-lg font-sans text-xs font-bold tracking-widest uppercase text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {showAll ? 'Show Less Reviews' : `Show All ${stats.total} Reviews`}
        </button>
      )}
    </div>
  );
}
