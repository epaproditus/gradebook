import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    
    await supabase.auth.exchangeCodeForSession(code);

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user?.email) {
      // Check if student exists
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('google_email', session.user.email)
        .single();

      if (student) {
        // Update google_id if not set
        if (!student.google_id) {
          await supabase
            .from('students')
            .update({ google_id: session.user.id })
            .eq('id', student.id);
        }
        
        return NextResponse.redirect(new URL('/student', requestUrl.origin));
      }
    }
  }

  // If anything fails, redirect to not-authorized
  return NextResponse.redirect(new URL('/auth/not-found', requestUrl.origin));
}
