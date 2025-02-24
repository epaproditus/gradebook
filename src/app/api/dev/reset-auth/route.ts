import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  if (process.env.NODE_ENV === 'development') {
    try {
      const supabase = createRouteHandlerClient({ cookies });
      
      // First sign out current session
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear all auth cookies
      const cookieStore = cookies();
      const authCookies = [
        'sb-access-token',
        'sb-refresh-token',
        'supabase-auth-token',
        'session',
        '__session',
        'sb-provider-token'
      ];

      // Delete specific auth cookies
      authCookies.forEach(name => {
        cookies().delete(name);
      });

      // Also clear all cookies that contain 'auth' or 'session'
      for (const cookie of cookieStore.getAll()) {
        if (cookie.name.includes('auth') || cookie.name.includes('session')) {
          cookies().delete(cookie.name);
        }
      }

      return NextResponse.json({ 
        message: 'Auth state reset',
        cleared: true
      });
    } catch (error) {
      console.error('Reset error:', error);
      return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
    }
  }
  
  return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
}
