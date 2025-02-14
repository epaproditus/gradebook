import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period');

    if (!period) {
      return NextResponse.json({ error: 'Period is required' }, { status: 400 });
    }

    console.log('Starting Google ID sync for period:', period);

    // Get all mappings for this period
    const { data: mappings, error: mappingError } = await supabase
      .from('student_mappings')
      .select(`
        student_id,
        google_id,
        google_email,
        period
      `)
      .eq('period', period);

    if (mappingError) {
      console.error('Mapping fetch error:', mappingError);
      throw mappingError;
    }

    if (!mappings?.length) {
      return NextResponse.json({
        message: `No mappings found for period ${period}`,
        period
      }, { status: 404 });
    }

    console.log('Found mappings:', mappings.length);

    // Prepare updates for students table
    const studentUpdates = mappings.map(mapping => ({
      id: mapping.student_id,        // This matches the students.id field
      google_classroom_id: mapping.google_id,  // Assuming this is the correct column name
      google_email: mapping.google_email
    }));

    // Log the first update for verification
    console.log('Sample update:', studentUpdates[0]);

    // Update students table
    const { data: updated, error: updateError } = await supabase
      .from('students')
      .upsert(studentUpdates, {
        onConflict: 'id'
      });

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      updated: studentUpdates.length,
      period,
      details: {
        mappingsFound: mappings.length,
        studentsUpdated: studentUpdates.length,
        firstUpdate: updated || null
      }
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({
      error: 'Failed to sync Google IDs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
