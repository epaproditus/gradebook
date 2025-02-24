// ...existing imports...

export async function middleware(req: NextRequest) {
  // Don't intercept API routes that handle auth
  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // ...rest of existing middleware code...
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
