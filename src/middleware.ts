import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ 
      req, 
      res,
    }, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });

    // Get session and await the response
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (!session) {
      console.log('No session, redirecting to signin');
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // Add session user to request headers
    res.headers.set('x-user-email', session.user.email ?? '');

    console.log('Session found for:', session.user.email);

    // Define protected paths
    const teacherOnlyPaths = ['/gradebook', '/classroom'];
    const studentPaths = ['/student'];

    // Teacher route check
    if (teacherOnlyPaths.some(route => req.nextUrl.pathname.startsWith(route))) {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('email')
        .eq('email', session.user.email)
        .maybeSingle();

      if (!teacher) {
        console.log('Non-teacher attempting to access:', req.nextUrl.pathname);
        return NextResponse.redirect(new URL('/student', req.url));
      }
    }

    // Student route check
    if (studentPaths.some(route => req.nextUrl.pathname.startsWith(route))) {
      const { data: student } = await supabase
        .from('student_mappings')
        .select('google_email')
        .eq('google_email', session.user.email)
        .maybeSingle();

      if (!student) {
        console.log('Invalid student attempting to access:', req.nextUrl.pathname);
        return NextResponse.redirect(new URL('/auth/not-found', req.url));
      }
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }
}

export const config = {
  matcher: [
    '/',
    '/gradebook/:path*', 
    '/classroom/:path*', 
    '/student/:path*',
    '/students/:path*',
    '/api/:path*',
    '/login'
  ],
};
