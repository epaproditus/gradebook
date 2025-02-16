import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string; assignmentId: string }> }
) {
  const { courseId, assignmentId } = await context.params;
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
  }

  const { forceUpdate, period } = requestBody;

  try {
    // Check if assignment exists first
    const { data: existingAssignment } = await supabase
      .from('assignments')
      .select('id')
      .eq('id', assignmentId)
      .single();

    if (existingAssignment && !forceUpdate) {
      return NextResponse.json({ 
        error: "Assignment already exists",
        existing: existingAssignment
      }, { status: 400 });
    }

    // Validate period exists in course mappings
    const { data: courseMapping } = await supabase
      .from('course_mappings')
      .select('setup_completed')
      .eq('google_course_id', courseId)
      .eq('period', period)
      .single();

    if (!courseMapping?.setup_completed) {
      return NextResponse.json({ 
        error: "Course period not set up. Please complete course setup first." 
      }, { status: 400 });
    }

    // Get assignment details from Google
    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}`,
      { headers: { Authorization: authHeader } }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || 'Failed to fetch assignment');
    }

    const assignment = await res.json();

    // Insert or update the assignment
    const { data: savedAssignment, error } = await supabase
      .from('assignments')
      .upsert({
        id: existingAssignment?.id || uuidv4(),
        name: assignment.title,
        type: 'Daily',
        periods: [period],
        date: new Date().toISOString().split('T')[0],
        subject: 'Math 8',
        max_points: assignment.maxPoints || 100,
        google_classroom_link: assignment.alternateLink || null
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
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Import failed",
      details: error
    }, { status: 500 });
  }
}
