import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { syncGradeToClassroom, syncGradeFromClassroom } from '@/lib/sync/grades';

export async function POST(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  const session = await getServerSession();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { direction, gradeId } = await request.json();

  try {
    if (direction === 'to-classroom') {
      await syncGradeToClassroom(gradeId, session.accessToken);
    } else {
      await syncGradeFromClassroom(params.courseId, gradeId, 'default', session.accessToken);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
