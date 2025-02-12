import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  const { courseId } = params;
  const { assignmentId, period } = await request.json();
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get assignment details from Google Classroom
    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}`,
      { headers: { Authorization: authHeader } }
    );

    if (!res.ok) {
      throw new Error('Failed to fetch assignment from Google Classroom');
    }

    const assignment = await res.json();

    // Insert into assignments table
    const { data: savedAssignment, error } = await supabase
      .from('assignments')
      .upsert({
        google_classroom_id: assignmentId,
        name: assignment.title,
        type: 'googleclassroom',
        periods: [period],
        date: new Date().toISOString().split('T')[0],
        max_points: assignment.maxPoints || 100
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true,
      assignment: savedAssignment
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
