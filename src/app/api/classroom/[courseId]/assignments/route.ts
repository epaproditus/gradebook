import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  const pageSize = Number(searchParams.get('pageSize')) || 5;
  const pageToken = searchParams.get('pageToken');

  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(`https://classroom.googleapis.com/v1/courses/${params.courseId}/courseWork`);
    url.searchParams.set('pageSize', pageSize.toString());
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    
    const res = await fetch(url, {
      headers: { Authorization: authHeader }
    });
    
    const data = await res.json();
    
    if (res.ok) {
      return NextResponse.json({
        courseWork: data.courseWork || [],
        nextPageToken: data.nextPageToken || null
      });
    } else {
      console.error('Google Classroom error:', data);
      return NextResponse.json({ error: data.error?.message || "Error" }, { status: res.status });
    }
  } catch (error) {
    console.error('Failed to fetch assignments:', error);
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
