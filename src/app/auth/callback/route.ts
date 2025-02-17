import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');

    // Handle errors from OAuth provider
    if (error) {
      console.error('Auth error:', { error, description: errorDescription });
      return NextResponse.redirect(
        new URL(`/auth/signin?error=${error}&error_description=${errorDescription}`, 
        requestUrl.origin)
      );
    }

    if (!code) {
      return NextResponse.redirect(new URL('/auth/signin?error=missing_code', requestUrl.origin));
    }

    // Create redirect response
    const redirectResponse = NextResponse.redirect(new URL('/student', requestUrl.origin));
    
    // Initialize Supabase client with cookie store
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient(
      { cookies: () => cookieStore },
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        }
      }
    );

    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }
    if (!session?.user?.email) throw new Error('No email in session');

    // Check student mapping
    const { data: student } = await supabase
      .from('student_mappings')
      .select('student_id, period')
      .eq('google_email', session.user.email)
      .single();

    if (student) {
      // Set user cookies
      redirectResponse.cookies.set('user-period', student.period, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });

      redirectResponse.cookies.set('user-id', student.student_id.toString(), {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });

      return redirectResponse;
    }

    // No student found
    return NextResponse.redirect(
      new URL(`/auth/not-found?email=${encodeURIComponent(session.user.email)}`, 
      requestUrl.origin)
    );

  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=auth_failed', requestUrl.origin));
  }
}
