import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { submissions } = await request.json();
    
    // Setup Google Classroom client
    const classroom = google.classroom({ version: 'v1', headers: {
      Authorization: `Bearer ${session.accessToken}`
    }});

    // Process submissions in parallel
    const results = await Promise.all(
      submissions.map(async (sub: any) => {
        try {
          await classroom.courses.courseWork.studentSubmissions.patch({
            courseId: sub.courseId,
            courseWorkId: sub.courseWorkId,
            id: sub.userId,
            updateMask: 'assignedGrade,draftGrade',
            requestBody: {
              assignedGrade: sub.assignedGrade,
              draftGrade: sub.assignedGrade
            }
          });
          return { success: true, userId: sub.userId };
        } catch (err) {
          console.error('Failed to update submission:', err);
          return { success: false, userId: sub.userId, error: err };
        }
      })
    );

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Grade sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync grades' },
      { status: 500 }
    );
  }
}
