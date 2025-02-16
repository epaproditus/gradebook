import { NextResponse } from 'next/server';
import { getGoogleAuthHeader } from '@/lib/googleAuth';

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const { searchParams } = new URL(request.url);
    const pageSize = searchParams.get('pageSize') || '5';

    // Get fresh auth header
    const authHeader = await getGoogleAuthHeader();

    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?pageSize=${pageSize}&orderBy=updateTime desc`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
        // Add cache control
        cache: 'no-store'
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('Google API error:', data);
      // If unauthorized, clear the session
      if (res.status === 401) {
        return NextResponse.json({ error: "Session expired" }, { status: 401 });
      }
      throw new Error(data.error?.message || 'Failed to fetch assignments');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch assignments" 
    }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params;
  const authHeader = request.headers.get("authorization");
  const body = await request.json();

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Handle grade syncing here
  // This will update grades both in your DB and Google Classroom
  // Implementation depends on your database structure
}

