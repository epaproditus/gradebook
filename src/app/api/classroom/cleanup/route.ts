import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function POST(request: Request) {
  try {
    // First delete related grades
    await supabase
      .from('grades')
      .delete()
      .filter('assignment_id', 'in', (
        supabase
          .from('assignments')
          .select('id')
          .not('google_classroom_id', 'is', null)
      ));

    // Then delete the assignments
    const { error } = await supabase
      .from('assignments')
      .delete()
      .not('google_classroom_id', 'is', null);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
