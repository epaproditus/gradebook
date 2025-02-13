import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type GradeData = {
  studentId: string;
  grade: number;
};

export async function PUT(
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

    console.log('Processing grades for sync:', {
      courseId,
      courseWorkId,
      gradeCount: grades.length,
      sampleGrade: grades[0],
      allGrades: grades
    });

    // Process each student's grade
    const results = await Promise.all(
      grades.map(async ({ studentId, grade }) => {
        if (!studentId) {
          console.error('Missing studentId for grade:', { grade });
          return { studentId: 'unknown', success: false, error: 'Missing student ID' };
        }

        try {
          // 1. Get student's submission ID first
          const submissionsResponse = await fetch(
            `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions?userId=${studentId}`,
            {
              headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Accept': 'application/json',
              }
            }
          );

          if (!submissionsResponse.ok) {
            const error = await submissionsResponse.json();
            console.error('Submission fetch error:', error);
            throw new Error(`Failed to fetch submission: ${error.error?.message || submissionsResponse.statusText}`);
          }

          const { studentSubmissions } = await submissionsResponse.json();
          
          if (!studentSubmissions?.[0]) {
            console.warn(`No submission found for student ${studentId}`);
            return { studentId, error: 'No submission found' };
          }

          const submissionId = studentSubmissions[0].id;

          // 2. Update the submission with the grade using correct URL and updateMask
          const updateResponse = await fetch(
            `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}?updateMask=assignedGrade,draftGrade`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                assignedGrade: grade,
                draftGrade: grade
              })
            }
          );

          if (!updateResponse.ok) {
            const error = await updateResponse.json();
            console.error('Grade update error:', error);
            throw new Error(`Failed to update grade: ${error.error?.message || updateResponse.statusText}`);
          }

          return { studentId, success: true };
        } catch (error) {
          console.error('Grade sync error:', { studentId, grade, error });
          return { 
            studentId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log('Sync completed:', { successCount, failureCount, results });

    return Response.json({ 
      results,
      summary: { successCount, failureCount }
    });
  } catch (error) {
    console.error('Sync API error:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Failed to sync grades' 
    }, { 
      status: 500 
    });
  }
}
