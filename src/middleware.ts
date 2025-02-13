import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Only handle auth-related routes
  if (!request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  try {
    const response = NextResponse.next();

    // Pass through the state token if it exists
    const stateToken = request.cookies.get('next-auth.state');
    if (stateToken) {
      response.cookies.set({
        name: 'next-auth.state',
        value: stateToken.value,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 900 // 15 minutes
      });
    }

    // Preserve the callback URL
    const callbackUrl = request.cookies.get('next-auth.callback-url');
    if (callbackUrl) {
      response.cookies.set({
        name: 'next-auth.callback-url',
        value: callbackUrl.value,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }

    const csrfToken = request.cookies.get('next-auth.csrf-token');
    if (csrfToken) {
      response.cookies.set({
        name: 'next-auth.csrf-token',
        value: csrfToken.value,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

// Update matcher to be more specific
export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/auth/callback/google',
    '/api/auth/signin',
    '/api/auth/signout'
  ]
};
