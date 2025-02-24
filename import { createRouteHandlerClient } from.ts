import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  
  // Handle session endpoint specifically
  if (requestUrl.pathname === '/api/auth/session') {
    try {
      const supabase = createRouteHandlerClient({ cookies });
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      return NextResponse.json({ 
        session,
        expires: session?.expires_at
      });
    } catch (error) {
      console.error('Session error:', error);
      return NextResponse.json({ session: null }, { status: 200 });
    }
  }

  // Handle other auth routes
  // ...existing code...
}

export async function POST(request: Request) {
  // ...existing code...
}
