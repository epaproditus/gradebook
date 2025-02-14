import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { syncGradeToClassroom } from '@/lib/classroom/gradeSync';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function PUT(
  request: Request,
  { params }: { params: { assignmentId: string } }
) {
  const session = await getServerSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { grades, courseId } = await request.json();

    // 1. First fetch the student mappings from our database
    const { data: studentMappings, error: mappingError } = await supabase
      .from('student_mappings')
      .select('student_id, google_id')
      .eq('course_id', courseId);

    if (mappingError) {
      throw new Error(`Failed to fetch student mappings: ${mappingError.message}`);
    }

    // Create a map for quick lookup
    const mappingsMap = new Map(
      studentMappings?.map(mapping => [mapping.student_id.toString(), mapping.google_id]) || []
    );

    // 2. First get all submissions for this assignment
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const classroom = google.classroom({ version: 'v1', auth });
    const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
      courseId,
      courseWorkId: params.assignmentId,
    });

    const submissions = submissionsResponse.data.studentSubmissions || [];
    
    // Create a map of google user IDs to submission IDs
    const submissionMap = new Map(
      submissions.map(sub => [sub.userId, sub.id])
    );

    // Track successful and failed syncs
    const results = {
      success: [] as any[],
      failed: [] as any[],
      foundMappings: 0
    };

    // 3. Sync each grade
    for (const grade of grades) {
      const googleId = mappingsMap.get(grade.studentId.toString());
      
      if (!googleId) {
        results.failed.push({
          studentId: grade.studentId,
          error: 'No Google ID mapping found'
        });
        continue;
      }

      // Get the submission ID for this student
      const submissionId = submissionMap.get(googleId);
      
      if (!submissionId) {
        results.failed.push({
          studentId: grade.studentId,
          googleId,
          error: 'No submission found for student'
        });
        continue;
      }

      results.foundMappings++;

      try {
        const syncResult = await syncGradeToClassroom(session, {
          courseId,
          courseWorkId: params.assignmentId,
          id: submissionId, // Use the submission ID, not the user's Google ID
          assignedGrade: grade.value
        });

        results.success.push({
          studentId: grade.studentId,
          googleId,
          submissionId,
          syncResult
        });

      } catch (error: any) {
        results.failed.push({
          studentId: grade.studentId,
          googleId,
          submissionId,
          error: error.message
        });
      }
    }

    // 4. Return sync results
    return NextResponse.json({
      success: results.success.length,
      failed: results.failed.length,
      foundMappings: results.foundMappings,
      details: {
        success: results.success,
        failed: results.failed
      }
    });

  } catch (error: any) {
    console.error('Grade sync error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
