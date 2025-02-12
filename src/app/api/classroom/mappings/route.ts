import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('course_mappings')
      .select('*');

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: "Failed to fetch mappings" }, { status: 500 });
  }
}
