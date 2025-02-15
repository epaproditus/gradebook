import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface SyncGradeParams {
  assignmentId: string;
  periodId: string;
}

export async function getGradesForSync({ assignmentId, periodId }: SyncGradeParams) {
  console.log('Starting grade sync preparation:', { assignmentId, periodId });
  
  try {
    if (!assignmentId || !periodId) {
      console.error('Invalid parameters:', { assignmentId, periodId });
      throw new Error('Missing required parameters');
    }

    // Get assignment with debug info
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    console.log('Assignment query result:', {
      assignment,
      error: assignmentError,
      hasGoogleId: assignment?.google_classroom_id
    });

    if (assignmentError) throw assignmentError;
    if (!assignment?.google_classroom_id) {
      throw new Error('Assignment not linked to Google Classroom');
    }

    // Get grades from database
    const { data: grades, error: gradesError } = await supabase
      .from('grades')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('period', periodId);

    console.log('Retrieved grades:', {
      count: grades?.length || 0,
      error: gradesError,
      firstGrade: grades?.[0]
    });

    if (gradesError) throw gradesError;

    // Get students with debug info
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('class_period', periodId);

    console.log('Students query result:', {
      count: students?.length || 0,
      error: studentsError,
      firstStudent: students?.[0]
    });

    if (studentsError) throw studentsError;

    // Rest of the function...
    // Verify period is valid for this assignment
    if (!assignment.periods.includes(periodId)) {
      throw new Error(`Period ${periodId} not found in assignment periods: ${assignment.periods.join(', ')}`);
    }

    const [courseId, courseWorkId] = assignment.google_classroom_id.split('_');
    if (!courseId || !courseWorkId) {
      throw new Error('Invalid Google Classroom ID format');
    }

    // Get student mappings for this period
    const { data: mappings, error: mappingsError } = await supabase
      .from('student_mappings')
      .select('*')
      .eq('period', periodId);

    console.log('Found mappings:', {
      count: mappings?.length || 0,
      periodId,
      sampleMapping: mappings?.[0]
    });

    if (mappingsError) throw mappingsError;

    // Create a map of student IDs to Google IDs
    const studentToGoogleMap = new Map(
      mappings.map(m => [String(m.student_id), m.google_id])
    );

    // Format grades for Google Classroom
    const formattedGrades = grades
      .filter(grade => {
        const hasGoogleId = studentToGoogleMap.has(String(grade.student_id));
        if (!hasGoogleId) {
          console.log('Student missing Google ID mapping:', {
            studentId: grade.student_id,
            grade: grade.grade
          });
        }
        return hasGoogleId;
      })
      .map(grade => {
        // Get Google ID for student
        const userId = studentToGoogleMap.get(String(grade.student_id));
        // Parse numeric grade and ensure it's in 0-100 range
        const numericGrade = Math.min(100, Math.max(0, parseInt(grade.grade) || 0));
        
        return {
          userId,
          assignedGrade: numericGrade,
          // Store for debugging
          originalGrade: grade.grade,
          studentId: grade.student_id
        };
      });

    console.log('Formatted grades:', {
      count: formattedGrades.length,
      grades: formattedGrades
    });

    if (formattedGrades.length === 0) {
      throw new Error(`No grades found with Google Classroom mappings. 
        Found ${grades.length} grades and ${mappings.length} mappings for period ${periodId}`);
    }

    return formattedGrades;

  } catch (error) {
    console.error('Detailed sync error:', {
      error,
      assignmentId,
      periodId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
