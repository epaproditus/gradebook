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
    // Get assignment details
    const [assignmentRes, studentsRes] = await Promise.all([
      fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}`,
        { headers: { Authorization: authHeader } }
      ),
      fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/students`,
        { headers: { Authorization: authHeader } }
      )
    ]);

    const [assignment, studentsData] = await Promise.all([
      assignmentRes.json(),
      studentsRes.json()
    ]);

    // Try inserting without specifying subject first to see the error details
    const { data: importedAssignment, error: insertError } = await supabase
      .from('assignments')
      .upsert({
        id: assignmentId,
        name: assignment.title,
        date: assignment.dueDate 
          ? `${assignment.dueDate.year}-${assignment.dueDate.month}-${assignment.dueDate.day}`
          : new Date().toISOString().split('T')[0],
        type: 'classroom',
        periods: ['1'],
        google_classroom_id: assignmentId,
        google_classroom_link: `https://classroom.google.com/c/${courseId}/a/${assignmentId}`
      })
      .select()
      .single();

    if (insertError) {
      console.error('Full assignment insert error:', insertError);
      throw insertError;
    }

    // Update or create student mappings if needed
    for (const student of studentsData.students || []) {
      const email = student.profile.emailAddress;
      await supabase.from('students')
        .update({ 
          google_id: student.userId,
          google_email: email 
        })
        .filter('name->first', 'ilike', email.split('.')[0])
        .filter('name->last', 'ilike', email.split('.')[1].split('@')[0]);
    }

    return NextResponse.json({ 
      success: true, 
      assignment: importedAssignment,
      redirect: `/gradebook?assignment=${importedAssignment.id}`
    });
  } catch (error) {
    console.error('Import error details:', error);
    return NextResponse.json({ 
      error: "Import failed", 
      details: error 
    }, { status: 500 });
  }
}
