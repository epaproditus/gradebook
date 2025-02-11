import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: session.accessToken });

    const classroom = google.classroom({ version: 'v1', auth });
    
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      // List courses if no courseId provided
      const { data: courses } = await classroom.courses.list({
        courseStates: ['ACTIVE']
      });
      return NextResponse.json({ courses: courses.courses || [] });
    }

    // Get course work if courseId is provided
    const { data: courseWork } = await classroom.courses.courseWork.list({
      courseId
    });

    return NextResponse.json({ courseWork: courseWork.courseWork || [] });
  } catch (error) {
    console.error('Classroom API error:', error);
    return NextResponse.json({ error: 'Failed to fetch classroom data' }, { status: 500 });
  }
}
