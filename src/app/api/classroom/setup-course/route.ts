import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { courseId, period, subject, name } = await request.json();
    
    const supabase = createRouteHandlerClient({ cookies });

    const { data, error } = await supabase
      .from('course_mappings')
      .insert({
        google_course_id: courseId,
        period: period,
        subject: subject, // Store the selected subject
        name: name,
        setup_completed: true,
        setup_completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Setup course error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to setup course' }), 
      { status: 500 }
    );
  }
}
