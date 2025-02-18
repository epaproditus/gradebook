import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Always use the public URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
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

    // Create Supabase client with proper cookie store
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: async () => cookieStore 
    });

    // Exchange code for session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=auth_failed`);
    }

    const response = NextResponse.redirect(`${baseUrl}/gradebook`);

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
    return NextResponse.redirect(`${baseUrl}/auth/signin?error=unknown`);
  }
}
