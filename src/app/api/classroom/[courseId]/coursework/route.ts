import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  const { courseId } = params;
  
  try {
    const token = await getToken({ 
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token?.accessToken) {
      console.error('No access token found');
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    console.log('Fetching coursework:', { courseId, tokenPrefix: token.accessToken.slice(0, 20) });

    // First verify the course exists
    const courseResponse = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}`,
      {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!courseResponse.ok) {
      const courseError = await courseResponse.json();
      console.error('Course verification failed:', courseError);
      return NextResponse.json(
        { error: 'Course not found or access denied' },
        { status: courseResponse.status }
      );
    }

    // Then get coursework
    const response = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`,
      {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Google Classroom API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: data,
        courseId
      });

      if (response.status === 401) {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 });
      }

      throw new Error(data.error?.message || `Failed to fetch coursework: ${response.statusText}`);
    }

    return NextResponse.json({ 
      courseWork: data.courseWork || [],
      courseId 
    });

  } catch (error) {
    console.error('Error in coursework API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch coursework' },
      { status: 500 }
    );
  }
}
