import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    
    if (!code) {
      return NextResponse.redirect(new URL('/auth/signin?error=missing_code', requestUrl.origin));
    }

    // Create cookie store and client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient(
      { cookies: () => cookieStore }
    );

    // Exchange code for session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError || !session?.user?.email) {
      console.error('Session error:', sessionError);
      return NextResponse.redirect(new URL('/auth/signin?error=auth_failed', requestUrl.origin));
    }

    // Check if user is a teacher first
    const { data: teacher } = await supabase
      .from('teachers')
      .select('email')
      .eq('email', session.user.email)
      .maybeSingle();

    if (teacher) {
      // Teacher found, redirect to gradebook
      return NextResponse.redirect(new URL('/gradebook', requestUrl.origin));
    }

    // Check if user is a student
    const { data: student } = await supabase
      .from('student_mappings')
      .select('student_id, period')
      .eq('google_email', session.user.email)
      .maybeSingle();

    if (student) {
      // Student found, set cookies and redirect
      const response = NextResponse.redirect(new URL('/student', requestUrl.origin));
      
      // Set user cookies
      response.cookies.set('user-period', student.period, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });

      response.cookies.set('user-id', student.student_id.toString(), {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });

      return response;
    }

    // No valid user found
    return NextResponse.redirect(
      new URL(`/auth/not-found?email=${encodeURIComponent(session.user.email)}`, 
      requestUrl.origin)
    );

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=auth_failed', requestUrl.origin));
  }
}
