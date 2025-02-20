import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const TEACHER_EMAIL = 'abromero@eeisd.org'; // This should be in an environment variable

export async function POST(request: Request) {
  try {
    const { studentId, assignmentId, message, type } = await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    // Get the teacher record - we know it exists
    const { data: teacherData, error: teacherError } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', TEACHER_EMAIL)
      .single();

    if (teacherError) {
      throw new Error(`Teacher not found: ${teacherError.message}`);
    }

    // Create message with teacher_id
    const { data, error } = await supabase
      .from('messages')
      .insert({
        student_id: studentId,
        assignment_id: assignmentId,
        message,
        type,
        status: 'unread',
        teacher_id: teacherData.id
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error handling message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create message' }, 
      { status: 500 }
    );
  }
}

// ...rest of file remains the same...
