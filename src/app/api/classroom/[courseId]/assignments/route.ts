import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabase } from '@/lib/supabaseConfig';

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  const session = await getServerSession();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${params.courseId}/courseWork`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Accept': 'application/json',
        }
      }
    );
    const data = await res.json();

    if (res.ok && data.courseWork) {
      // Match your existing schema
      await supabase.from('assignments').upsert(
        data.courseWork.map((work: any) => ({
          id: work.id,
          name: work.title,
          date: work.dueDate?.day ? `${work.dueDate.year}-${work.dueDate.month}-${work.dueDate.day}` : new Date().toISOString().split('T')[0],
          type: 'classroom', // or map from work.workType
          periods: ['1'], // Default to first period, adjust as needed
          subject: work.subject
        }))
      );
    }

    return NextResponse.json(data);
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
