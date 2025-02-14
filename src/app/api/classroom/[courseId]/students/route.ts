import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    // First, await both session and params together
    const [session, { courseId }] = await Promise.all([
      getServerSession(authOptions),
      context.params
    ]);
    
    // Debug logging to verify params
    console.log('API route params:', { courseId });
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const classroom = google.classroom({ 
      version: 'v1', 
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });

    // Get course details first
    const { data: courseData } = await classroom.courses.get({
      id: courseId
    });

    // Debug course details
    console.log('Course details:', {
      name: courseData.name,
      id: courseData.id
    });

    // Get students with full name details
    const { data } = await classroom.courses.students.list({
      courseId: courseId,
      fields: 'students(userId,profile(emailAddress,name(givenName,familyName,fullName)))',
      pageSize: 100
    });

    return NextResponse.json({
      course: courseData,
      students: data.students || []
    });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch students',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
