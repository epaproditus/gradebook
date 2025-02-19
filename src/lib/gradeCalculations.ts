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
  types: ('Daily' | 'Assessment')[]
): number => {
  // Validate input arrays
  if (!Array.isArray(grades) || !Array.isArray(types) || grades.length !== types.length) {
    console.warn('Invalid input to calculateWeightedAverage:', { grades, types });
    return 0;
  }

  // Filter valid pairs of grades and types
  const validPairs = grades.map((grade, i) => ({ grade, type: types[i] }))
    .filter(pair => pair.type !== undefined);

  const dailyGrades = validPairs
    .filter(pair => pair.type === 'Daily')
    .map(pair => pair.grade);

  const assessmentGrades = validPairs
    .filter(pair => pair.type === 'Assessment')
    .map(pair => pair.grade);

  // If no valid grades, return 0
  if (dailyGrades.length === 0 && assessmentGrades.length === 0) {
    return 0;
  }

  // Calculate averages
  const dailyAvg = dailyGrades.length > 0
    ? dailyGrades.reduce((sum, grade) => sum + grade, 0) / dailyGrades.length
    : 0;

  const assessmentAvg = assessmentGrades.length > 0
    ? assessmentGrades.reduce((sum, grade) => sum + grade, 0) / assessmentGrades.length
    : 0;

  // Apply weights based on available grades
  if (dailyGrades.length === 0) return assessmentAvg;
  if (assessmentGrades.length === 0) return dailyAvg;

  // Normal weighted calculation
  return Math.round((dailyAvg * 0.8) + (assessmentAvg * 0.2));
};
