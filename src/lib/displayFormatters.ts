export const formatGradeDisplay = (value: number | null): string => {
  if (value === null) return '-';
  if (value === 0) return '0';
  return value.toString();
};

export const getGradeDisplayClass = (value: number | null): string => {
  if (value === null) return 'text-muted-foreground italic';
  if (value === 0) return 'text-red-500 font-medium';
  return 'font-medium';
};
