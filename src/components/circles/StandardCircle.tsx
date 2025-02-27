'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface StandardCircleProps {
  percentage: number;
}

export const StandardCircle = memo(({ percentage }: StandardCircleProps) => {
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  
  return (
    <svg 
      className="w-full h-full transform -rotate-90" 
      viewBox="0 0 24 24"
      style={{ border: '1px solid red' }} // Debug border
    >
      {/* Debug center point */}
      <circle cx="12" cy="12" r="1" fill="red" />
      
      {/* Background circle */}
      <circle
        cx="12"
        cy="12"
        r={radius}
        className="stroke-zinc-800 fill-none"
        strokeWidth="2"
        style={{ opacity: 0.3 }} // Make background more visible
      />
      
      {/* Progress circle */}
      <circle
        cx="12"
        cy="12"
        r={radius}
        className={cn(
          "fill-none transition-all duration-500",
          percentage >= 70 ? "stroke-green-500" :
          percentage >= 50 ? "stroke-yellow-500" :
          "stroke-red-500"
        )}
        strokeWidth="2"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={`${circumference - (percentage/100) * circumference}`}
        strokeLinecap="round"
      />
      
      {/* Debug text */}
      <text x="12" y="24" fontSize="4px" textAnchor="middle" fill="blue">
        {percentage}%
      </text>
    </svg>
  );
});

StandardCircle.displayName = 'StandardCircle';
