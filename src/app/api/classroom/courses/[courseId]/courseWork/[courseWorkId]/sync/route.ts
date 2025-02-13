import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type GradeData = {
  studentId: string;
  grade: number;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string; courseWorkId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { grades } = await request.json() as { grades: GradeData[] };
    const { courseId, courseWorkId } = params;

    // Process each student's grade
    const results = await Promise.all(
      grades.map(async ({ studentId, grade }) => {
        try {
          // 1. Get student's submission
          const submissionsResponse = await fetch(
            `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions?userId=${studentId}`,
            {
              headers: {
                'Authorization': `Bearer ${session.accessToken}`,
              }
            }
          );

          if (!submissionsResponse.ok) {
            throw new Error('Failed to fetch submission');
          }

          const { studentSubmissions } = await submissionsResponse.json();
          if (!studentSubmissions?.[0]) {
            return { studentId, error: 'No submission found' };
          }

          // 2. Update submission with grade
          const updateResponse = await fetch(
            `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${studentSubmissions[0].id}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                draftGrade: grade,
                assignedGrade: grade
              })
            }
          );

          if (!updateResponse.ok) {
            const error = await updateResponse.json();
            throw new Error(error.error?.message || 'Failed to update grade');
          }

          return { studentId, success: true };
        } catch (error) {
          console.error('Grade sync error for student', studentId, error);
          return { 
            studentId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
    );

    return Response.json({ results });
  } catch (error) {
    console.error('Sync API error:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Failed to sync grades' 
    }, { 
      status: 500 
    });
  }
}
