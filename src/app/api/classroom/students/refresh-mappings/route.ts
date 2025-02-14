import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { fetchStudentProfiles, matchStudentsByName } from '@/lib/classroom/studentMapping';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
  const session = await getServerSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { courseId, periodId } = await request.json(); // Add periodId to destructuring
    
    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    if (!periodId) {
      return NextResponse.json(
        { error: 'Period ID is required' },
        { status: 400 }
      );
    }

    // 1. Fetch students from Google Classroom
    const classroomStudents = await fetchStudentProfiles(session, courseId);

    // 2. Fetch local students
    const { data: localStudents, error: dbError } = await supabase
      .from('students')
      .select('id, name')
      .eq('course_id', courseId);

    if (dbError) throw new Error(dbError.message);

    // 3. Match students and update mappings
    const mappings = matchStudentsByName(classroomStudents, localStudents || []);
    
    // 4. Update database with new mappings - using a transaction
    const { error: updateError } = await supabase.from('student_mappings').upsert(
      Array.from(mappings.entries()).map(([studentId, googleProfile]) => ({
        student_id: studentId,
        google_id: googleProfile.googleId,
        google_email: googleProfile.googleEmail,
        course_id: courseId,
        period_id: periodId, // Changed from period to period_id to match db schema
        last_synced: new Date().toISOString()
      })),
      { 
        onConflict: 'student_id,course_id',
        ignoreDuplicates: false 
      }
    );

    if (updateError) {
      console.error('Error updating mappings:', updateError);
      throw new Error(`Failed to update student mappings: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      mappings: Object.fromEntries(mappings),
      totalMapped: mappings.size
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
