import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string; assignmentId: string }> }
) {
  const { courseId, assignmentId } = await context.params;
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { gradeId, grade } = await request.json();

    // Get the grade from our database
    const { data: gradeData } = await supabase
      .from('grades')
      .select('*, students(google_id)')
      .eq('id', gradeId)
      .single();

    if (!gradeData?.students?.google_id) {
      throw new Error('Student not mapped to Google Classroom');
    }

    // Update grade in Google Classroom
    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}/studentSubmissions/lookup?userId=${gradeData.students.google_id}`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedGrade: Number(grade),
          draftGrade: Number(grade)
        })
      }
    );

    if (!res.ok) {
      throw new Error('Failed to sync grade to Google Classroom');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Grade sync error:', error);
    return NextResponse.json({ error: "Failed to sync grade" }, { status: 500 });
  }
}
