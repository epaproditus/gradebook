import { getServerSession } from "next-auth/next";
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');
  
  if (!courseId) {
    return NextResponse.json({ error: "Course ID required" }, { status: 400 });
  }

  try {
    // Use session token or access token for API calls
    const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Accept': 'application/json',
      }
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Classroom API error:', error);
    return NextResponse.json({ error: 'Failed to fetch classroom data' }, { status: 500 });
  }
}
