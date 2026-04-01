'use client';

import { useState } from 'react';
import { Star, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ReviewFormProps {
  productId: string;
  onReviewSubmitted?: () => void;
}

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

function StarRating({ rating, onRatingChange, size = 'md' }: StarRatingProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  const gap = size === 'sm' ? 'gap-1' : size === 'md' ? 'gap-2' : 'gap-3';

  return (
    <div className={`flex ${gap}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingChange(star)}
          className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-dark focus:ring-offset-2 rounded"
        >
          <Star
            className={`${sizes[size]} transition-colors duration-200 ${
              star <= rating
                ? 'fill-[#ffc107] text-[#ffc107]'
                : 'fill-transparent text-gray-300 hover:text-gray-400'
            }`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewForm({ productId, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= 1000) {
      setContent(text);
      setCharCount(text.length);
    }
  };

  const resetForm = () => {
    setRating(0);
    setReviewerName('');
    setReviewerEmail('');
    setContent('');
    setCharCount(0);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!reviewerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (content.trim().length < 10) {
      setError('Review must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/storefront/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating,
          content: content.trim(),
          reviewerName: reviewerName.trim(),
          reviewerEmail: reviewerEmail.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setSubmitted(true);
      onReviewSubmitted?.();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-[#F6FBF7] border border-[#E8F3EA] rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-semantic-success" />
        </div>
        <h3 className="font-serif text-xl text-primary-dark mb-2">Thank You!</h3>
        <p className="font-sans text-sm text-gray-600 mb-6 max-w-sm mx-auto">
          Your review has been submitted and will be visible after moderation. We appreciate your feedback!
        </p>
        <button
          onClick={() => { setSubmitted(false); resetForm(); }}
          className="text-xs font-bold tracking-widest uppercase text-gray-500 hover:text-primary-dark border-b border-gray-300 hover:border-primary-dark transition-colors pb-0.5"
        >
          Write Another Review
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 md:p-8 shadow-sm">
      <h3 className="font-serif text-2xl text-primary-dark mb-2">Write a Review</h3>
      <p className="font-sans text-xs text-gray-500 mb-6 tracking-widest uppercase">
        Share your experience with other moms
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="font-sans text-xs font-bold tracking-widest uppercase text-primary-dark block mb-3">
            Your Rating *
          </label>
          <div className="flex items-center gap-3">
            <StarRating rating={hoverRating || rating} onRatingChange={setRating} size="lg" />
            <span className="font-sans text-sm text-gray-500">
              {rating > 0 && (
                <span className="text-primary-dark font-bold">{rating}</span>
              )}
              {rating === 0 && 'Select rating'}
            </span>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="font-sans text-xs font-bold tracking-widest uppercase text-primary-dark block mb-2">
            Your Name *
          </label>
          <input
            type="text"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg font-sans text-sm text-primary-dark placeholder:text-gray-400 outline-none focus:border-gray-400 transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label className="font-sans text-xs font-bold tracking-widest uppercase text-primary-dark block mb-2">
            Email <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="email"
            value={reviewerEmail}
            onChange={(e) => setReviewerEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg font-sans text-sm text-primary-dark placeholder:text-gray-400 outline-none focus:border-gray-400 transition-colors"
          />
          <p className="font-sans text-[10px] text-gray-400 mt-1.5 tracking-wide">
            Your email will not be published
          </p>
        </div>

        {/* Review Content */}
        <div>
          <label className="font-sans text-xs font-bold tracking-widest uppercase text-primary-dark block mb-2">
            Your Review *
          </label>
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Share your experience with this maternity wear..."
            rows={5}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg font-sans text-sm text-primary-dark placeholder:text-gray-400 outline-none focus:border-gray-400 transition-colors resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="font-sans text-[10px] text-gray-400 tracking-wide">
              Minimum 10 characters
            </p>
            <p className={`font-sans text-[10px] ${charCount > 900 ? 'text-orange-500' : 'text-gray-400'}`}>
              {charCount}/1000
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 text-semantic-error flex-shrink-0" />
            <p className="font-sans text-xs text-semantic-error">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || rating === 0}
          className={`w-full py-4 rounded-lg font-sans text-xs font-bold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 ${
            isSubmitting || rating === 0
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-[#191919] text-white hover:bg-black'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Review
            </>
          )}
        </button>

        <p className="font-sans text-[10px] text-gray-400 text-center tracking-wide">
          Reviews are moderated before publishing
        </p>
      </form>
    </div>
  );
}
