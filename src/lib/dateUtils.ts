// Create utility functions to determine the current Six Weeks period based on dates
// with proper timezone handling to ensure consistent results

interface SixWeeksRange {
  period: '1SW' | '2SW' | '3SW' | '4SW' | '5SW' | '6SW';
  start: Date;
  end: Date;
}

// Define the six weeks ranges with consistent date handling
// Using ISO format strings to avoid timezone issues
const SIX_WEEKS_RANGES: SixWeeksRange[] = [
  { period: '1SW', start: new Date('2024-08-14T00:00:00.000Z'), end: new Date('2024-09-22T23:59:59.999Z') },
  { period: '2SW', start: new Date('2024-09-23T00:00:00.000Z'), end: new Date('2024-11-03T23:59:59.999Z') },
  { period: '3SW', start: new Date('2024-11-04T00:00:00.000Z'), end: new Date('2024-12-22T23:59:59.999Z') },
  { period: '4SW', start: new Date('2025-01-09T00:00:00.000Z'), end: new Date('2025-02-19T23:59:59.999Z') },
  { period: '5SW', start: new Date('2025-02-24T00:00:00.000Z'), end: new Date('2025-04-17T23:59:59.999Z') },
  { period: '6SW', start: new Date('2025-04-22T00:00:00.000Z'), end: new Date('2025-05-29T23:59:59.999Z') }
];

/**
 * Gets the current six weeks period based on today's date
 * @returns The current six weeks period code (e.g., '6SW')
 */
export function getCurrentSixWeeks(): string {
  const now = new Date();
  // Normalize the date to just year-month-day for consistent comparison
  const normalizedNow = normalizeDate(now);
  
  const currentPeriod = SIX_WEEKS_RANGES.find(
    range => normalizedNow >= normalizeDate(range.start) && normalizedNow <= normalizeDate(range.end)
  );
  
  return currentPeriod?.period || '6SW'; // Default to current six weeks (6SW) if not found
}

/**
 * Determines which six weeks period a given date falls into
 * @param date The date to check
 * @returns The six weeks period code for the date (e.g., '6SW')
 */
export function getSixWeeksForDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return '6SW'; // Better handling of invalid dates
  
  // Normalize the date to just year-month-day for consistent comparison
  const normalizedDate = normalizeDate(date);
  
  // Find the period that contains this date
  const period = SIX_WEEKS_RANGES.find(
    range => normalizedDate >= normalizeDate(range.start) && normalizedDate <= normalizeDate(range.end)
  );

  if (!period) {
    // Debug info to help with troubleshooting
    console.warn(`Date ${date.toISOString()} (normalized: ${normalizedDate.toISOString()}) did not match any six weeks period`);
  }
  
  return period?.period || '6SW'; // Default to current six weeks (6SW) if not found
}

/**
 * Normalizes a date by removing time components for consistent comparison
 * This ensures dates are compared purely by year, month and day
 * @param date The date to normalize
 * @returns A new Date object with only year, month, and day components
 */
function normalizeDate(date: Date): Date {
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ));
}

/**
 * Debugging function to help troubleshoot date-related issues
 * @param dateString A date string to test against all six weeks periods
 * @returns Information about which six weeks period the date belongs to
 */
export function debugDatePeriod(dateString: string): { 
  inputDate: string, 
  normalizedDate: string, 
  matchedPeriod: string,
  allPeriods: { period: string, matches: boolean, start: string, end: string }[]
} {
  const date = new Date(dateString);
  const normalizedDate = normalizeDate(date);
  const sixWeeks = getSixWeeksForDate(date);
  
  return {
    inputDate: date.toISOString(),
    normalizedDate: normalizedDate.toISOString(),
    matchedPeriod: sixWeeks,
    allPeriods: SIX_WEEKS_RANGES.map(range => ({
      period: range.period,
      matches: normalizedDate >= normalizeDate(range.start) && normalizedDate <= normalizeDate(range.end),
      start: range.start.toISOString(),
      end: range.end.toISOString()
    }))
  };
}

/**
 * Utility to recalculate six weeks periods for existing assignments
 * @param assignments An array of assignments with dates
 * @returns The assignments with updated six_weeks_period values
 */
export function recalculateSixWeeksForAssignments<T extends { date: Date; six_weeks_period?: string }>(
  assignments: T[]
): T[] {
  return assignments.map(assignment => ({
    ...assignment,
    six_weeks_period: getSixWeeksForDate(assignment.date)
  }));
}
