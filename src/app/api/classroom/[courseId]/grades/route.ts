import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  const { courseId } = params;
  const { grade, studentId, assignmentId } = await request.json();
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get student's Google ID
    const { data: student } = await supabase
      .from('student_mappings')
      .select('google_id')
      .eq('student_id', studentId)
      .single();

    if (!student?.google_id) {
      throw new Error('Student not mapped to Google Classroom');
    }

    // Get assignment's Google Classroom ID
    const { data: assignment } = await supabase
      .from('assignments')
      .select('google_classroom_id')
      .eq('id', assignmentId)
      .single();

    if (!assignment?.google_classroom_id) {
      throw new Error('Assignment not mapped to Google Classroom');
    }

    // Update grade in Google Classroom
    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignment.google_classroom_id}/studentSubmissions/${student.google_id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedGrade: grade,
          draftGrade: grade
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
