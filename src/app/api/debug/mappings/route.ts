import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    if (!period) {
      return NextResponse.json({ error: 'Period is required' }, { status: 400 });
    }

    // Get both mappings and course setup status
    const [mappings, courseMapping] = await Promise.all([
      supabase
        .from('student_mappings')
        .select(`
          *,
          students (
            id,
            name,
            google_id,
            email,
            class_period
          )
        `)
        .eq('period', period),

      supabase
        .from('course_mappings')
        .select('*')
        .eq('period', period)
    ]);

    return NextResponse.json({
      mappings: mappings.data,
      courseMapping: courseMapping.data,
      count: mappings.data?.length || 0,
      period,
      setupStatus: {
        hasCourseMapping: (courseMapping.data || []).length > 0,
        hasStudentMappings: (mappings.data ?? []).length > 0
      }
    });

  } catch (error) {
    console.error('Mapping debug error:', error);
    return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 });
  }
}
