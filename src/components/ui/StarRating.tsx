'use client';

import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  // We add an optional className so you can easily change the size of the stars
  // depending on where you use it (e.g., big stars for the overall score, small for individual reviews)
  className?: string; 
}

export default function StarRating({ rating, className = "w-4 h-4" }: StarRatingProps) {
  // Round the rating to the nearest whole number for the visual star fill
  const roundedRating = Math.round(rating);

  return (
    <div className="flex items-center space-x-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star 
          key={star} 
          className={`transition-colors ${className} ${
            star <= roundedRating 
              ? 'fill-[#ffc107] text-[#ffc107]' // Active Yellow Star
              : 'fill-gray-200 text-gray-200'  // Inactive Gray Star
          }`} 
        />
      ))}
    </div>
  );
}