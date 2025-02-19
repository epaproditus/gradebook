type GradeInfo = {
  grade: string | null;
  extra: string;
  type: 'Daily' | 'Assessment';
};

export const calculateTotal = (grade: string | null | undefined, extra: string = '0'): number => {
  // Key change: Now we ALWAYS count a grade, whether it's missing, null, undefined, or '0'
  const baseGrade = parseInt(grade || '0') || 0; // This ensures 0 for any invalid/missing grade
  const extraGrade = parseInt(extra || '0') || 0;
  
  return Math.min(100, Math.max(0, baseGrade + extraGrade));
};

export const calculateWeightedAverage = (grades: GradeInfo[]): number => {
  const dailyGrades = grades
    .filter(g => g.type === 'Daily')
    .map(g => calculateTotal(g.grade, g.extra)); // Every grade counts, no filtering
  
  const assessmentGrades = grades
    .filter(g => g.type === 'Assessment')
    .map(g => calculateTotal(g.grade, g.extra));

  // Every grade counts in the average
  const dailyAvg = dailyGrades.length > 0
    ? dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length
    : 0;

  const assessmentAvg = assessmentGrades.length > 0
    ? assessmentGrades.reduce((a, b) => a + b, 0) / assessmentGrades.length
    : 0;

  const dailyPoints = dailyAvg * 0.8;
  const assessmentPoints = assessmentAvg * 0.2;

  return parseFloat((dailyPoints + assessmentPoints).toFixed(1));
};
