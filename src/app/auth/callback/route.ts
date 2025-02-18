import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/auth/signin?error=no_code', requestUrl.origin));
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    });

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) throw sessionError;
      if (!session) throw new Error('No session returned');

      // Check student role
      if (session?.user?.email) {
        const { data: student } = await supabase
          .from('students')
          .select('*')
          .eq('google_email', session.user.email)
          .single();

        if (student) {
          // Update student's Google ID if needed
          if (!student.google_id) {
            await supabase
              .from('students')
              .update({ google_id: session.user.id })
              .eq('id', student.id);
          }

          return NextResponse.redirect(new URL('/student', requestUrl.origin));
        }
      }

      // No student record found
      return NextResponse.redirect(new URL('/auth/not-found', requestUrl.origin));

    } catch (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.redirect(new URL('/auth/signin?error=session', requestUrl.origin));
    }

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=unknown', requestUrl.origin));
  }
}
