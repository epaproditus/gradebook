import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const period = searchParams.get('period');

    if (!courseId || !period) {
      return NextResponse.json({ error: 'Course ID and period are required' }, { status: 400 });
    }

    // Get all relevant data
    const [courseMapping, studentMappings, students] = await Promise.all([
      supabase
        .from('course_mappings')
        .select('*')
        .eq('google_course_id', courseId)
        .eq('period', period)
        .single(),
      
      supabase
        .from('student_mappings')
        .select('*')
        .eq('period', period),
      
      supabase
        .from('students')
        .select('*')
        .eq('class_period', period)
    ]);

    return NextResponse.json({
      courseMapping: courseMapping.data,
      studentMappings: studentMappings.data,
      periodStudents: students.data,
      diagnostics: {
        courseId,
        period,
        timestamp: new Date().toISOString(),
        hasMapping: !!courseMapping.data,
        studentCount: students.data?.length || 0,
        mappingCount: studentMappings.data?.length || 0
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
