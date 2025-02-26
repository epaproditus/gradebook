//Create a utility function to determine the current Six Weeks period based on dates:

interface SixWeeksRange {
  period: '1SW' | '2SW' | '3SW' | '4SW' | '5SW' | '6SW';
  start: Date;
  end: Date;
}

const SIX_WEEKS_RANGES: SixWeeksRange[] = [
  { period: '1SW', start: new Date('2023-08-14'), end: new Date('2023-09-22') },
  { period: '2SW', start: new Date('2023-09-25'), end: new Date('2023-11-03') },
  { period: '3SW', start: new Date('2023-11-06'), end: new Date('2023-12-22') },
  { period: '4SW', start: new Date('2024-01-09'), end: new Date('2024-02-16') },
  { period: '5SW', start: new Date('2024-02-20'), end: new Date('2024-04-05') },
  { period: '6SW', start: new Date('2024-04-08'), end: new Date('2024-05-23') }
];

export function getCurrentSixWeeks(): string {
  const now = new Date();
  const currentPeriod = SIX_WEEKS_RANGES.find(
    range => now >= range.start && now <= range.end
  );
  return currentPeriod?.period || '5SW'; // Default to 5SW if not found
}

export function getSixWeeksForDate(date: Date): string {
  const period = SIX_WEEKS_RANGES.find(
    range => date >= range.start && date <= range.end
  );
  return period?.period || '5SW';
}
