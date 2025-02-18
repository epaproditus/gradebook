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

    // Create cookie store and await all cookie operations
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: async () => {
        // Ensure all cookie operations are properly awaited
        const response = new Response();
        const cookies = new Map();
        
        for (const cookie of cookieStore.getAll()) {
          cookies.set(cookie.name, cookie);
        }
        
        return {
          get: async (name: string) => cookies.get(name)?.value,
          set: async (name: string, value: string, options: any) => {
            cookieStore.set(name, value, options);
          },
          remove: async (name: string, options: any) => {
            cookieStore.delete(name, options);
          }
        };
      }
    });
    
    // Exchange code for session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return NextResponse.redirect(new URL('/auth/signin?error=session', requestUrl.origin));
    }

    // Check user role
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

    // If no student record found, redirect to not-found
    return NextResponse.redirect(new URL('/auth/not-found', requestUrl.origin));
    
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=unknown', request.url));
  }
}
