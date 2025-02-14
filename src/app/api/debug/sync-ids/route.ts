import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    if (!period) {
      return NextResponse.json({ error: 'Period required' }, { status: 400 });
    }

    // 1. Get all student mappings for the period
    const { data: mappings, error: mappingError } = await supabase
      .from('student_mappings')
      .select('student_id, google_id, google_email')
      .eq('period', period);

    if (mappingError) throw mappingError;

    // 2. Update students table with Google IDs
    const updates = mappings?.map(mapping => ({
      id: mapping.student_id,
      google_id: mapping.google_id,
      email: mapping.google_email || null
    }));

    if (!updates?.length) {
      return NextResponse.json({
        message: 'No mappings found to sync',
        period
      });
    }

    // 3. Update all students at once
    const { data: updated, error: updateError } = await supabase
      .from('students')
      .upsert(updates, {
        onConflict: 'id'
      });

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      synced: updates.length,
      period,
      details: {
        beforeSync: await checkStudents(period),
        afterSync: await checkStudents(period)
      }
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Failed to sync IDs' }, { status: 500 });
  }
}

async function checkStudents(period: string) {
  const { data } = await supabase
    .from('students')
    .select('id, name, google_id')
    .eq('class_period', period);
    
  return {
    total: data?.length || 0,
    withGoogleId: data?.filter(s => s.google_id)?.length || 0,
    withoutGoogleId: data?.filter(s => !s.google_id)?.length || 0
  };
}
