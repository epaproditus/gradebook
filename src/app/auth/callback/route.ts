import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    
    if (error) {
      console.error('Auth error:', error);
      return NextResponse.redirect(new URL('/auth/signin?error=' + error, requestUrl.origin));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/auth/signin?error=missing_code', requestUrl.origin));
    }

    // Create Supabase client with proper cookie store
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: async () => cookieStore 
    });

    // Exchange code for session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.redirect(new URL('/auth/signin?error=auth_failed', requestUrl.origin));
    }

    const response = NextResponse.redirect(new URL('/gradebook', requestUrl.origin));

    // Set cookies with proper attributes
    await cookieStore.set({
      name: 'sb-access-token',
      value: session.access_token,
      path: '/',
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=unknown', request.url));
  }
}
