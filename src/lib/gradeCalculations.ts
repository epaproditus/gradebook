export const calculateTotal = (grade: string | undefined, extra: string = '0'): number => {
  const baseGrade = grade ? parseInt(grade) || 0 : 0; // Convert blank/undefined to 0
  const extraPoints = parseInt(extra) || 0;
  return Math.min(100, Math.max(0, baseGrade + extraPoints));
};

// This file is already set up correctly with:
// - calculateTotal() - combines grade + extra points
// - calculateWeightedAverage() - handles weighted averages with extra points

export const calculateWeightedAverage = (
  grades: number[], 
  types: ('Daily' | 'Assessment')[]
): number => {
  if (grades.length === 0) return 0;
  
  const dailyGrades = grades.filter((_, i) => types[i] === 'Daily');
  const assessmentGrades = grades.filter((_, i) => types[i] === 'Assessment');
  
  const dailyAvg = dailyGrades.length > 0 
    ? dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length 
    : 0;
  
  const assessmentAvg = assessmentGrades.length > 0 
    ? assessmentGrades.reduce((a, b) => a + b, 0) / assessmentGrades.length 
    : dailyAvg; // Use daily average if no assessments
  
  return Math.round((dailyAvg * 0.8) + (assessmentAvg * 0.2));
};
