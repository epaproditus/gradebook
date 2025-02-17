import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Check if accessing student routes
  if (req.nextUrl.pathname.startsWith('/student')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // Find student record by Google email
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('google_email', session.user.email)
      .single();

    if (!student) {
      return NextResponse.redirect(new URL('/auth/not-found', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/student/:path*']
};
