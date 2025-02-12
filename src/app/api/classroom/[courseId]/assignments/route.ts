import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${params.courseId}/courseWork`,
      {
        headers: { Authorization: authHeader }
      }
    );
    
    const data = await res.json();
    
    if (res.ok) {
      // Just return the assignments without importing
      return NextResponse.json(data);
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
