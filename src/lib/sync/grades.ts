import { supabase } from '../supabaseConfig';
import type { Grade } from '../db/types';

export async function syncGradeToClassroom(
  gradeId: string,
  accessToken: string
) {
  const { data: grade, error } = await supabase
    .from('grades')
    .select(`
      *,
      assignments (
        id,
        name,
        type
      )
    `)
    .eq('id', gradeId)
    .single();

  if (error || !grade || grade.assignments?.type !== 'classroom') return;

  const response = await fetch(
    `https://classroom.googleapis.com/v1/courses/${grade.assignments.id}/studentSubmissions/submit`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        draftGrade: parseInt(grade.grade),
        assignedGrade: parseInt(grade.grade)
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to sync grade to Classroom');
  }
}

export async function syncGradeFromClassroom(
  assignmentId: string,
  studentId: string,
  period: string,
  accessToken: string
) {
  const response = await fetch(
    `https://classroom.googleapis.com/v1/courses/${assignmentId}/studentSubmissions/${studentId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) return;

  const data = await response.json();
  
  await supabase.from('grades').upsert({
    assignment_id: assignmentId,
    student_id: studentId,
    period: period,
    grade: data.assignedGrade.toString(),
  });
}
