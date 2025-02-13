
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string; courseWorkId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get assignment grades data
    const { grades } = await request.json();
    if (!grades || !Array.isArray(grades)) {
      return Response.json({ error: 'Invalid grades data' }, { status: 400 });
    }

    // Process each grade submission
    const results = await Promise.all(
      grades.map(async ({ studentId, grade }) => {
        try {
          // First get the student's submission
          const submissionResponse = await fetch(
            `https://classroom.googleapis.com/v1/courses/${params.courseId}/courseWork/${params.courseWorkId}/studentSubmissions?userId=${studentId}`,
            {
              headers: {
                'Authorization': `Bearer ${session.accessToken}`,
              }
            }
          );

          if (!submissionResponse.ok) {
            throw new Error('Failed to fetch submission');
          }

          const { studentSubmissions } = await submissionResponse.json();
          if (!studentSubmissions?.[0]) {
            throw new Error('No submission found');
          }

          const submission = studentSubmissions[0];

          // Update the submission with the grade
          const updateResponse = await fetch(
            `https://classroom.googleapis.com/v1/courses/${params.courseId}/courseWork/${params.courseWorkId}/studentSubmissions/${submission.id}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                draftGrade: parseFloat(grade),
                assignedGrade: parseFloat(grade)
              }),
              cache: 'no-store',
            }
          );

          if (!updateResponse.ok) {
            const error = await updateResponse.json();
            throw new Error(error.error?.message || 'Failed to update grade');
          }

          return {
            studentId,
            success: true,
            grade
          };
        } catch (error) {
          return {
            studentId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Grade sync error:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Failed to sync grades' 
    }, { 
      status: 500 
    });
  }
}
