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
  status?: string;
}

export const calculateDailyPoints = (assignments: { grade: string; extra: string; type: string }[]) => {
  const dailyAssignments = assignments.filter(a => a.type === 'Daily');
  if (dailyAssignments.length === 0) return 0;
  
  const total = dailyAssignments.reduce((sum, assignment) => {
    return sum + calculateTotal(assignment.grade, assignment.extra);
  }, 0);
  
  // Calculate percentage out of 50 points (50% weight)
  return Math.round((total / dailyAssignments.length) * 0.5);
};

export const calculateAssessmentPoints = (assignments: { grade: string; extra: string; type: string }[]) => {
  const assessmentAssignments = assignments.filter(a => a.type === 'Assessment');
  if (assessmentAssignments.length === 0) return 20; // Return full points if no assessments yet
  
  const total = assessmentAssignments.reduce((sum, assignment) => {
    return sum + calculateTotal(assignment.grade, assignment.extra);
  }, 0);
  
  // Calculate percentage out of 50 points (50% weight)
  return Math.round((total / assessmentAssignments.length) * 0.5);
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
  
  // Otherwise use 50/50 split
  const dailyAvg = dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length;
  const assessmentAvg = assessmentGrades.reduce((a, b) => a + b, 0) / assessmentGrades.length;
  
  return Math.round((dailyAvg * 0.5) + (assessmentAvg * 0.5));
};

// Add this new helper to standardize calculations
export const calculateStudentAverage = (assignments: { grade: string; extra: string; type: string }[]) => {
  // If there are no assignments at all, return 100
  if (assignments.length === 0) return 100;

  const dailyGrades = assignments.filter(a => a.type === 'Daily')
    .map(a => calculateTotal(a.grade, a.extra));
    
  const assessmentGrades = assignments.filter(a => a.type === 'Assessment')
    .map(a => calculateTotal(a.grade, a.extra));

  // Calculate each component's contribution to final grade
  const dailyComponent = dailyGrades.length > 0 
    ? (dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length) * 0.5
    : 0;

  const assessmentComponent = assessmentGrades.length > 0
    ? (assessmentGrades.reduce((a, b) => a + b, 0) / assessmentGrades.length) * 0.5
    : 0;

  // If one type is missing, scale up the other type's weight
  if (dailyGrades.length === 0 && assessmentGrades.length > 0) {
    return Math.round(assessmentComponent * 2); // Scale up from 50% to 100%
  }
  if (assessmentGrades.length === 0 && dailyGrades.length > 0) {
    return Math.round(dailyComponent * 2); // Scale up from 50% to 100%
  }

  // Both types present - use normal weighting
  return Math.round(dailyComponent + assessmentComponent);
};
