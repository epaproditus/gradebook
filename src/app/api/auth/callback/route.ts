import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/';

    if (code) {
      const supabase = createRouteHandlerClient({ cookies });
      
      // Clear any existing session first
      await supabase.auth.signOut();

      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL(`/auth/signin?error=${error.message}`, request.url));
      }

      if (data?.session) {
        const { data: student } = await supabase
          .from('student_mappings')
          .select('student_id')
          .eq('google_email', data.session.user.email)
          .single();

        if (student) {
          return NextResponse.redirect(new URL(`/student/${student.student_id}`, request.url));
        }
      }
    }

    // If no code or session, redirect to signin
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  } catch (error) {
    console.error('Critical auth error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=server_error', request.url));
  }
}
