import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    
    if (error) {
      console.error('Auth error:', error);
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=${error}`);
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=missing_code`);
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    });

    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=auth_failed`);
    }

    const response = NextResponse.redirect(`${baseUrl}/gradebook`);

    // Set cookies using the response object
    response.cookies.set('sb-access-token', session.access_token, {
      path: '/',
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(`${baseUrl}/auth/signin?error=unknown`);
  }
}
