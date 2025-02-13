import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { syncGradeToClassroom } from '@/lib/classroom/gradeSync';
import { StudentSubmissionPatchRequest } from '@/lib/classroom/types';

export async function POST(request: Request) {
  const session = await getServerSession();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body: StudentSubmissionPatchRequest = await request.json();

    // Validate required fields
    if (!body.courseId || !body.courseWorkId || !body.id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Need either draftGrade or assignedGrade
    if (body.draftGrade === undefined && body.assignedGrade === undefined) {
      return NextResponse.json(
        { error: 'Either draftGrade or assignedGrade must be provided' },
        { status: 400 }
      );
    }

    const result = await syncGradeToClassroom(session, body);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
