import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  const { courseId } = await params;
  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  const pageSize = searchParams.get('pageSize') || '5';

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?pageSize=${pageSize}&orderBy=updateTime desc`,
      {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('Google API error:', data);
      throw new Error(data.error?.message || 'Failed to fetch assignments');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  // Handle grade syncing here
  // This will update grades both in your DB and Google Classroom
  // Implementation depends on your database structure
}
  const { courseId } = params;
  const authHeader = request.headers.get("authorization");
  const body = await request.json();

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

