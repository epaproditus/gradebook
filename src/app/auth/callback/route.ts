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

    // Get cookie store
    const cookieStore = cookies();

    // Create Supabase client with async cookie handler
    const supabase = createRouteHandlerClient({ 
      cookies: () => Promise.resolve({
        get: async (name: string) => {
          const cookie = await cookieStore.get(name);
          return cookie?.value;
        },
        set: async (name: string, value: string, options: any) => {
          await cookieStore.set(name, value, options);
        },
        remove: async (name: string, options: any) => {
          await cookieStore.delete(name, options);
        }
      })
    });

    // Exchange code for session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return NextResponse.redirect(new URL('/auth/signin?error=session', requestUrl.origin));
    }

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

        const response = NextResponse.redirect(new URL('/student', requestUrl.origin));
        
        // Set auth cookie with proper attributes
        await cookieStore.set('sb-access-token', session.access_token, {
          path: '/',
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 // 24 hours
        });

        return response;
      }
    }

    return NextResponse.redirect(new URL('/auth/not-found', requestUrl.origin));

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=unknown', request.url));
  }
}
