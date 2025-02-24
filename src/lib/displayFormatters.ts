export const formatGradeDisplay = (value: number | null): string => {
  if (value === null) return '-';
  return `${value}`;
};

export const getGradeDisplayClass = (value: number): string => {
  if (value >= 90) return 'text-emerald-500';
  if (value >= 80) return 'text-blue-500';
  if (value >= 70) return 'text-yellow-500';
  return 'text-red-500';
};
