import React, { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ rating = 0, onRate = null, readOnly = false, size = 'md' }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10'
  };

  const currentSize = starSizes[size] || starSizes.md;

  const handleClick = (value) => {
    if (!readOnly && onRate) {
      onRate(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((starValue) => {
        const activeValue = hoverRating || rating;
        const isFilled = starValue <= activeValue;

        return (
          <button
            key={starValue}
            type="button"
            disabled={readOnly}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => !readOnly && setHoverRating(starValue)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
            className={`transition-all duration-200 focus:outline-none ${
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-125'
            }`}
          >
            <Star
              className={`${currentSize} ${
                isFilled
                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                  : 'text-slate-600 fill-slate-800/40'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
