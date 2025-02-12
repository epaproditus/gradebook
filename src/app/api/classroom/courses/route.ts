import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log('Fetching courses with token:', session.accessToken.substring(0, 20) + '...');
    
    const response = await fetch(
      'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE',
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'application/json',
        },
        cache: 'no-store'
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Google API Error:', data);
      throw new Error(data.error?.message || 'Failed to fetch courses');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Courses API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}