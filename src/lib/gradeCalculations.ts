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
  
  // Calculate totals with extra points first
  const gradesWithExtra = grades.map((grade, i) => 
    calculateTotal(grade.toString(), extraPoints[i] || '0')
  );
  
  const dailyGrades = gradesWithExtra.filter((_, i) => types[i] === 'Daily');
  const assessmentGrades = gradesWithExtra.filter((_, i) => types[i] === 'Assessment');
  
  // If no assessments, use 100% daily grades
  if (assessmentGrades.length === 0) {
    return dailyGrades.length > 0 
      ? Math.round(dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length)
      : 0;
  }
  
  const dailyAvg = dailyGrades.length > 0 
    ? dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length 
    : 0;
  
  const assessmentAvg = assessmentGrades.reduce((a, b) => a + b, 0) / assessmentGrades.length;
  
  return Math.round((dailyAvg * 0.8) + (assessmentAvg * 0.2));
};
