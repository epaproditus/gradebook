import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  const { courseId } = params;
  const { period } = await request.json();
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all grades for the period that have Google Classroom mappings
    const { data: grades } = await supabase
      .from('grades')
      .select(`
        *,
        students!inner(google_id),
        assignments!inner(google_classroom_id)
      `)
      .eq('period', period);

    if (!grades?.length) {
      return NextResponse.json({ message: "No grades to export" });
    }

    // Export each grade to Google Classroom
    const updates = grades.map(async (grade) => {
      const res = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${grade.assignments.google_classroom_id}/studentSubmissions/${grade.students.google_id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assignedGrade: grade.score,
            draftGrade: grade.score
          })
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to update grade for student ${grade.student_id}`);
      }
    });

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Grade export error:', error);
    return NextResponse.json({ error: "Failed to export grades" }, { status: 500 });
  }
}
