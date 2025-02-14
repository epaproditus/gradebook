import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { fetchStudentProfiles } from '@/lib/classroom/studentMapping';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: Request) {
  const session = await getServerSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');
  const periodId = searchParams.get('periodId');

  if (!courseId || !periodId) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    // Fetch Google Classroom students
    const googleStudents = await fetchStudentProfiles(session, courseId);

    // Fetch local students with their current mappings
    const { data: localStudents, error: dbError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        student_mappings!inner(google_id)
      `)
      .eq('course_id', courseId)
      .eq('period_id', periodId);

    if (dbError) throw new Error(dbError.message);

    const mappings = localStudents?.map(student => ({
      localStudent: {
        id: student.id,
        name: student.name
      },
      googleId: student.student_mappings?.[0]?.google_id || null
    }));

    return NextResponse.json({
      mappings,
      googleStudents
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { studentId, googleId, courseId, periodId } = await request.json();

    const { error } = await supabase
      .from('student_mappings')
      .upsert({
        student_id: studentId,
        google_id: googleId,
        course_id: courseId,
        period_id: periodId,
        last_synced: new Date().toISOString()
      }, {
        onConflict: 'student_id,course_id'
      });

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
