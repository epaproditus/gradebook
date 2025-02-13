import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function PUT(
  request: Request,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { grades } = await request.json();

    // Submit grades directly to Google Classroom
    const response = await fetch(
      `https://classroom.googleapis.com/v1/courses/courseWork/${params.assignmentId}/studentSubmissions:modifyGrades`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissions: Object.entries(grades).map(([userId, grade]) => ({
            userId,
            draftGrade: parseInt(String(grade)),
            assignedGrade: parseInt(String(grade))
          }))
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${error}`);
    }

    return NextResponse.json({ 
      message: 'Grades synced successfully',
      result: await response.json()
    });

  } catch (error) {
    console.error('Error syncing grades:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync grades' },
      { status: 500 }
    );
  }
}
