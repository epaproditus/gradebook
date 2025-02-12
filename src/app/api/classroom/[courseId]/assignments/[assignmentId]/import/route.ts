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
    const { studentMappings, period, type, force = false } = await request.json();

    // Check for existing assignment
    const { data: existingAssignment } = await supabase
      .from('assignments')
      .select('*')
      .eq('google_classroom_id', assignmentId)
      .single();

    // If force is true, delete existing assignment and its grades
    if (existingAssignment) {
      console.log('Deleting existing assignment:', existingAssignment.id);
      
      // Delete grades first
      const { error: gradesDeleteError } = await supabase
        .from('grades')
        .delete()
        .eq('assignment_id', existingAssignment.id);

      if (gradesDeleteError) {
        console.error('Error deleting grades:', gradesDeleteError);
        throw gradesDeleteError;
      }

      // Then delete assignment
      const { error: assignmentDeleteError } = await supabase
        .from('assignments')
        .delete()
        .eq('id', existingAssignment.id);

      if (assignmentDeleteError) {
        console.error('Error deleting assignment:', assignmentDeleteError);
        throw assignmentDeleteError;
      }
    }

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

    // Track student mapping success
    let mappedStudentCount = 0;

    // Update or create student mappings
    for (const student of studentsData.students || []) {
      const email = student.profile.emailAddress;
      const { data: updatedStudent } = await supabase
        .from('students')
        .update({ 
          google_id: student.userId,
          google_email: email 
        })
        .filter('name->first', 'ilike', email.split('.')[0])
        .filter('name->last', 'ilike', email.split('.')[1].split('@')[0])
        .select()
        .single();

      if (updatedStudent) mappedStudentCount++;
    }

    // Create assignment after student mapping
    const { data: importedAssignment, error: insertError } = await supabase
      .from('assignments')
      .insert({
        id: assignmentId,
        name: assignment.title,
        date: assignment.dueDate 
          ? `${assignment.dueDate.year}-${String(assignment.dueDate.month).padStart(2, '0')}-${String(assignment.dueDate.day).padStart(2, '0')}`
          : null,
        type: type,
        periods: [period],
        maxPoints: assignment.maxPoints,
        google_classroom_id: assignmentId,
        google_classroom_link: `https://classroom.google.com/c/${courseId}/a/${assignmentId}`
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Create student mappings
    for (const mapping of studentMappings) {
      if (mapping.gradebookStudentId) {
        await supabase
          .from('student_google_mappings')
          .upsert({
            student_id: mapping.gradebookStudentId,
            google_id: mapping.googleId,
            google_email: mapping.googleEmail
          });
      }
    }

    return NextResponse.json({ 
      success: true, 
      assignment: importedAssignment,
      mappedStudents: mappedStudentCount,
      totalStudents: studentsData.students?.length || 0
    });
  } catch (error) {
    console.error('Import error details:', error);
    return NextResponse.json({ 
      error: "Import failed", 
      details: error 
    }, { status: 500 });
  }
}
