import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';
import type { MappingData, CourseMappingData } from '@/types/classroom';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    if (!period) {
      return NextResponse.json({ error: 'Period is required' }, { status: 400 });
    }

    // Check all related tables
    const [studentMappings, courseMappings] = await Promise.all([
      supabase
        .from('student_mappings')
        .select('*')
        .eq('period', period),
      
      supabase
        .from('course_mappings')
        .select('*')
        .eq('period', period)
    ]);

    // Return detailed status
    return NextResponse.json({
      period,
      diagnostics: {
        studentMappings: {
          count: studentMappings.data?.length ?? 0,
          data: studentMappings.data,
          error: studentMappings.error
        },
        courseMappings: {
          count: courseMappings.data?.length ?? 0,
          data: courseMappings.data,
          error: courseMappings.error
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Mapping check error:', error);
    return NextResponse.json({ error: 'Failed to check mappings' }, { status: 500 });
  }
}
