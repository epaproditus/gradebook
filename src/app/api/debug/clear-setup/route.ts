import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId')?.trim();
    const period = searchParams.get('period')?.trim();

    // Debug log
    console.log('Clearing setup for:', { courseId, period });

    if (!courseId || !period) {
      return NextResponse.json({ 
        error: 'Course ID and period are required',
        received: { courseId, period }
      }, { status: 400 });
    }

    // Force clean all related records in a transaction
    const { data, error } = await supabase.rpc('force_clear_course_setup', {
      p_course_id: courseId,
      p_period: period
    });

    // If RPC doesn't exist, fall back to manual deletion
    if (error?.message?.includes('function "force_clear_course_setup" does not exist')) {
      // 1. First, get all student mappings for this period
      const { data: mappings } = await supabase
        .from('student_mappings')
        .select('id')
        .eq('period', period);

      console.log('Found mappings to delete:', mappings?.length || 0);

      // 2. Delete student mappings
      if (mappings?.length) {
        const { error: deleteError } = await supabase
          .from('student_mappings')
          .delete()
          .in('id', mappings.map(m => m.id));

        if (deleteError) throw deleteError;
      }

      // 3. Delete course mapping
      const { error: courseError } = await supabase
        .from('course_mappings')
        .delete()
        .eq('google_course_id', courseId)
        .eq('period', period);

      if (courseError) throw courseError;
    }

    return NextResponse.json({ 
      success: true,
      details: {
        courseId,
        period,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Clear setup error:', error);
    return NextResponse.json({ 
      error: 'Failed to clear setup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
