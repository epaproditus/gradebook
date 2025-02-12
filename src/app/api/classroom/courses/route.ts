import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      console.log('No access token in session:', session);
      return NextResponse.json({ error: "No access token" }, { status: 401 });
    }

    console.log('Using access token:', session.accessToken);

    const res = await fetch(
      "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE",
      {
        headers: { 
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/json'
        },
        next: { revalidate: 0 }
      }
    );
    
    const data = await res.json();
    
    if (!res.ok) {
      console.error('Google API Error Response:', {
        status: res.status,
        statusText: res.statusText,
        data: data
      });
      return NextResponse.json({ error: data.error?.message || "Failed to fetch courses" }, { status: res.status });
    }
    
    return NextResponse.json({ courses: data.courses || [] });
  } catch (error) {
    console.error('Caught error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}