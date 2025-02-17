import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const res = NextResponse.next();

  try {
    const supabase = createMiddlewareClient({ req, res });
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session error:', error);
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    if (!session) {
      console.log('No session, redirecting to signin');
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    console.log('Session found for:', session.user.email);

    // Define protected paths
    const teacherOnlyPaths = ['/gradebook', '/classroom'];
    const studentPaths = ['/student'];

    // Teacher route check
    if (teacherOnlyPaths.some(route => path.startsWith(route))) {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('email')
        .eq('email', session.user.email)
        .maybeSingle();

      if (!teacher) {
        console.log('Non-teacher attempting to access:', path);
        return NextResponse.redirect(new URL('/student', req.url));
      }
    }

    // Student route check
    if (studentPaths.some(route => path.startsWith(route))) {
      const { data: student } = await supabase
        .from('student_mappings')
        .select('google_email')
        .eq('google_email', session.user.email)
        .maybeSingle();

      if (!student) {
        console.log('Invalid student attempting to access:', path);
        return NextResponse.redirect(new URL('/auth/not-found', req.url));
      }
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }
}

// Update matcher to include root path and be more specific
export const config = {
  matcher: [
    '/',
    '/gradebook/:path*', 
    '/classroom/:path*', 
    '/student/:path*'
  ],
};
