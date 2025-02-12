import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string; assignmentId: string }> }
) {
  const { assignmentId } = await context.params;

  try {
    const { data } = await supabase
      .from('assignments')
      .select('id')
      .eq('google_classroom_id', assignmentId)
      .maybeSingle();

    return NextResponse.json({ exists: !!data });
  } catch (error) {
    console.error('Check error:', error);
    return NextResponse.json({ exists: false });
  }
}
