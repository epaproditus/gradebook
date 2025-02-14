import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function POST(request: Request) {
  try {
    // 1. Get all students with existing Google IDs from the students table
    const { data: studentsWithGoogleIds, error } = await supabase
      .from('students')
      .select('*')
      .not('google_id', 'is', null);

    if (error) throw error;

    // 2. Create mapping records
    const mappings = studentsWithGoogleIds.map(student => ({
      student_id: student.id,
      google_id: student.google_id,
      google_email: student.email,
      period: student.class_period
    }));

    // 3. Insert into student_mappings table
    const { error: insertError } = await supabase
      .from('student_mappings')
      .upsert(mappings, {
        onConflict: 'student_id,period'
      });

    if (insertError) throw insertError;

    return NextResponse.json({ 
      success: true,
      mappingsCreated: mappings.length 
    });

  } catch (error) {
    console.error('Failed to initialize mappings:', error);
    return NextResponse.json(
      { error: 'Failed to initialize student mappings' },
      { status: 500 }
    );
  }
}
