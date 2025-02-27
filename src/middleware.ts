import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { RateLimiter } from '@/lib/rateLimiter';

const MAX_RETRIES = 5; // Increased from 3
const RETRY_DELAY = 2000; // Increased from 1000 (2 seconds)
const EXPONENTIAL_BACKOFF = true; // Add exponential backoff

const authRateLimiter = new RateLimiter(60000, 30); // 30 requests per minute
let lastSessionCheck = 0;
const SESSION_CHECK_INTERVAL = 5000; // 5 seconds

async function getSessionWithRetry(supabase: any, retries = 0): Promise<any> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error?.status === 429 && retries < MAX_RETRIES) {
      const delay = EXPONENTIAL_BACKOFF 
        ? RETRY_DELAY * Math.pow(2, retries)
        : RETRY_DELAY;
      
      console.log(`Rate limited, attempt ${retries + 1}/${MAX_RETRIES}. Waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getSessionWithRetry(supabase, retries + 1);
    }
    return { data, error };
  } catch (error) {
    console.error('Session error:', error);
    return { data: null, error };
  }
}

export async function middleware(req: NextRequest) {
  try {
    // Skip rate limiting for static resources
    if (req.nextUrl.pathname.match(/\.(js|css|png|jpg|ico)$/)) {
      return NextResponse.next();
    }

    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ 
      req, 
      res 
    }, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    });

    // Only check session if enough time has passed
    const now = Date.now();
    if (now - lastSessionCheck > SESSION_CHECK_INTERVAL) {
      await authRateLimiter.waitForAvailability();
      const { data: { session }, error } = await supabase.auth.getSession();
      lastSessionCheck = now;

      if (error?.status === 429) {
        console.log('Rate limited, waiting before retry...');
        return NextResponse.redirect(new URL('/auth/rate-limited', req.url));
      }

      if (!session) {
        return NextResponse.redirect(new URL('/auth/signin', req.url));
      }

      // Cache the session status
      res.headers.set('x-session-valid', 'true');
      res.headers.set('x-session-check', now.toString());
    }

    // Protect tutoring routes
    if (req.nextUrl.pathname.startsWith('/tutoring')) {
      if (!session) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/auth/error', req.url));
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
    '/login',
    '/tutoring/:path*'
  ],
};
