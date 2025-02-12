import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function POST(
  request: Request,
  { params }: { params: { courseId: string; assignmentId: string } }
) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Fetch assignment details from Google Classroom
    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${params.courseId}/courseWork/${params.assignmentId}`,
      {
        headers: { Authorization: authHeader }
      }
    );
    const assignment = await res.json();

    // Insert into your assignments table
    const { data: importedAssignment, error: insertError } = await supabase
      .from('assignments')
      .upsert({
        id: assignment.id,
        name: assignment.title,
        date: assignment.dueDate 
          ? `${assignment.dueDate.year}-${assignment.dueDate.month}-${assignment.dueDate.day}`
          : new Date().toISOString().split('T')[0],
        type: 'classroom',
        subject: assignment.subject,
        periods: ['1'], // You'll need to determine the correct period
        google_classroom_id: assignment.id // Add this column to your schema
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Fetch and store student submissions
    const submissionsRes = await fetch(
      `https://classroom.googleapis.com/v1/courses/${params.courseId}/courseWork/${params.assignmentId}/studentSubmissions`,
      {
        headers: { Authorization: authHeader }
      }
    );
    const submissions = await submissionsRes.json();

    // Create grades for each submission
    if (submissions.studentSubmissions) {
      await Promise.all(submissions.studentSubmissions.map(async (sub: any) => {
        // Find matching student in your gradebook
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('google_id', sub.userId)
          .single();

        if (student) {
          await supabase.from('grades').upsert({
            assignment_id: importedAssignment.id,
            student_id: student.id,
            grade: sub.assignedGrade?.toString() || '0',
            period: '1', // You'll need to determine the correct period
            google_submission_id: sub.id // Add this column to your schema
          });
        }
      }));
    }

    return NextResponse.json({ success: true, assignment: importedAssignment });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
