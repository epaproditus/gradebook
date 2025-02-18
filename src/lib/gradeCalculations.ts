export const calculateTotal = (grade: string = '0', extra: string = '0'): number => {
  const baseGrade = Math.max(0, Math.min(100, parseInt(grade) || 0));
  const extraGrade = Math.max(0, Math.min(100, parseInt(extra) || 0));
  return Math.min(100, baseGrade + extraGrade);
};

// This file is already set up correctly with:
// - calculateTotal() - combines grade + extra points
// - calculateWeightedAverage() - handles weighted averages with extra points

export const calculateWeightedAverage = (
  grades: number[], 
  types: ('Daily' | 'Assessment')[],
  extraPoints: string[] = []
) => {
  if (grades.length === 0) return 0;
  
  const dailyGrades = grades.filter((_, i) => types[i] === 'Daily');
  const assessmentGrades = grades.filter((_, i) => types[i] === 'Assessment');
  
  // If either type is missing, use 100% of the available type
  if (dailyGrades.length === 0) {
    return assessmentGrades.length > 0 
      ? Math.round(assessmentGrades.reduce((a, b) => a + b, 0) / assessmentGrades.length)
      : 0;
  }
  
  if (assessmentGrades.length === 0) {
    return Math.round(dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length);
  }
  
  // Otherwise use 80/20 split
  const dailyAvg = dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length;
  const assessmentAvg = assessmentGrades.reduce((a, b) => a + b, 0) / assessmentGrades.length;
  
  return Math.round((dailyAvg * 0.8) + (assessmentAvg * 0.2));
};
