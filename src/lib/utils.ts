import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStaarPerformanceLevel(score: number): string {
  if (score >= 83) return 'Masters';
  if (score >= 59) return 'Meets';
  if (score >= 50) return 'High Approaches';
  if (score >= 43) return 'Approaches';
  if (score >= 30) return 'High DNM';
  return 'Did Not Meet';
}
