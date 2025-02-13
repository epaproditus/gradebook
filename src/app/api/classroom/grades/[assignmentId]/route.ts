import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { headers } from 'next/headers';

export async function PUT(
  request: Request,
  { params }: { params: { assignmentId: string } }
) {
  try {
    // Get course ID from the assignment ID format (courseId_assignmentId)
    const [courseId, assignmentId] = params.assignmentId.split('_');
    
    if (!courseId || !assignmentId) {
      return NextResponse.json({ 
        error: 'Invalid assignment ID format. Expected courseId_assignmentId' 
      }, { status: 400 });
    }

    // Get token from the request
    const token = await getToken({ req: request as any });
    
    if (!token?.accessToken) {
      console.error('No access token found');
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    const { grades } = await request.json();
    
    console.log('Submitting grades:', {
      courseId,
      assignmentId,
      gradeCount: Object.keys(grades).length,
    });

    // Use the correct Google Classroom API endpoint format
    const response = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}/studentSubmissions/modifyGrades`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
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
      console.error('Google API Error:', {
        status: response.status,
        statusText: response.statusText,
        error,
        endpoint: `courses/${courseId}/courseWork/${assignmentId}/studentSubmissions/modifyGrades`
      });
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
