import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
    }

    return NextResponse.json({
      message: 'Copy these values to your .env.local file',
      tokens: {
        GOOGLE_ACCESS_TOKEN: session.accessToken,
        // The refresh token should be available in the JWT
        // You might need to sign out and sign in again to get a new refresh token
      }
    });

  } catch (error) {
    console.error('Debug route error:', error);
    return NextResponse.json({ error: 'Failed to get tokens' }, { status: 500 });
  }
}
