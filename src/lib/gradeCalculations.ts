export const calculateTotal = (grade: string = '0', extra: string = '0'): number => {
  const baseGrade = Math.max(0, Math.min(100, parseInt(grade) || 0));
  const extraGrade = Math.max(0, Math.min(100, parseInt(extra) || 0));
  return Math.min(100, baseGrade + extraGrade);
};

// This file is already set up correctly with:
// - calculateTotal() - combines grade + extra points
// - calculateWeightedAverage() - handles weighted averages with extra points

interface GradeInfo {
  grade: string | null;
  extra: string;
  type: 'Daily' | 'Assessment';
}

export const calculateDailyPoints = (assignments: GradeInfo[]): number => {
  const dailyGrades = assignments
    .filter(a => a.type === 'Daily')
    .map(a => calculateTotal(a.grade || '0', a.extra || '0'));

  if (dailyGrades.length === 0) return 0;
  
  const dailyAvg = dailyGrades.reduce((sum, grade) => sum + grade, 0) / dailyGrades.length;
  return Math.round(dailyAvg * 0.8); // 80% weight for daily work
};

export const calculateAssessmentPoints = (assignments: GradeInfo[]): number => {
  const assessmentGrades = assignments
    .filter(a => a.type === 'Assessment')
    .map(a => calculateTotal(a.grade || '0', a.extra || '0'));

  if (assessmentGrades.length === 0) return 0;
  
  const assessmentAvg = assessmentGrades.reduce((sum, grade) => sum + grade, 0) / assessmentGrades.length;
  return Math.round(assessmentAvg * 0.2); // 20% weight for assessments
};

export const totalPoints = (assignments: GradeInfo[]): number => {
  return calculateDailyPoints(assignments) + calculateAssessmentPoints(assignments);
};

export const calculateWeightedAverage = (
  grades: number[], 
  types: ('Daily' | 'Assessment')[]
): number => {
  // Validate inputs
  if (!Array.isArray(grades) || !Array.isArray(types)) {
    console.warn('Invalid inputs to calculateWeightedAverage:', { grades, types });
    return 0;
  }

  // Ensure arrays are the same length
  if (grades.length !== types.length) {
    console.warn('Mismatched array lengths in calculateWeightedAverage:', {
      gradesLength: grades.length,
      typesLength: types?.length
    });
    return 0;
  }

  if (grades.length === 0) return 0;
  
  // Create paired arrays to ensure we only process valid pairs
  const validPairs = grades.map((grade, i) => ({
    grade,
    type: types[i]
  })).filter(pair => pair.type != null);

  const dailyGrades = validPairs
    .filter(pair => pair.type === 'Daily')
    .map(pair => pair.grade);

  const assessmentGrades = validPairs
    .filter(pair => pair.type === 'Assessment')
    .map(pair => pair.grade);

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

// Add this new helper to standardize calculations
export const calculateStudentAverage = (assignments: GradeInfo[]): number => {
  if (assignments.length === 0) return 0;

  const dailyGrades = assignments
    .filter(a => a.type === 'Daily')
    .map(a => calculateTotal(a.grade || '0', a.extra || '0'));

  const assessmentGrades = assignments
    .filter(a => a.type === 'Assessment')
    .map(a => calculateTotal(a.grade || '0', a.extra || '0'));

  // If either type is missing, use 100% of the available type
  if (dailyGrades.length === 0) {
    return assessmentGrades.length > 0 
      ? Math.round(assessmentGrades.reduce((a, b) => a + b, 0) / assessmentGrades.length)
      : 0;
  }

  if (assessmentGrades.length === 0) {
    return Math.round(dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length);
  }

  // Calculate weighted average with 80/20 split
  const dailyAvg = dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length;
  const assessmentAvg = assessmentGrades.reduce((a, b) => a + b, 0) / assessmentGrades.length;

  return Math.round((dailyAvg * 0.8) + (assessmentAvg * 0.2));
};
