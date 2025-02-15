import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from '@/lib/supabaseConfig';

interface GradeRequest {
  studentId: number;
  grade: number;
  period: string;
}

export async function PUT(
  request: Request,
  context: { params: { courseId: string; courseWorkId: string } }
) {
  try {
    // Await the params
    const { courseId, courseWorkId } = context.params;

    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize OAuth2 client properly
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    // Set credentials with access token
    oauth2Client.setCredentials({
      access_token: session.accessToken
    });

    // Initialize Classroom API with auth client
    const classroom = google.classroom({ 
      version: 'v1',
      auth: oauth2Client
    });

    const { grades } = await request.json() as { grades: GradeRequest[] };
    
    // First, get all Google IDs for these students from mappings table
    const { data: mappings, error: mappingError } = await supabase
      .from('student_mappings')
      .select('student_id, google_id')
      .eq('period', grades[0].period)
      .in('student_id', grades.map(g => g.studentId));

    if (mappingError) {
      console.error('Failed to fetch student mappings:', mappingError);
      return NextResponse.json({ error: 'Failed to fetch student mappings' }, { status: 500 });
    }

    // Create lookup map for Google IDs
    const googleIdMap = new Map(
      mappings?.map(m => [m.student_id, m.google_id]) || []
    );

    console.log('Starting grade sync with mappings:', {
      totalGrades: grades.length,
      mappingsFound: mappings?.length,
      sampleMapping: mappings?.[0]
    });

    // Process grades using Google IDs
    const results = await Promise.all(
      grades.map(async ({ studentId, grade }) => {
        try {
          const googleId = googleIdMap.get(studentId);
          if (!googleId) {
            throw new Error(`No Google ID found for student ${studentId}`);
          }

          console.log('Looking up submission:', {
            studentId,
            googleId,
            courseId,
            courseWorkId
          });

          // Get submission using Google ID
          const { data: submissions } = await classroom.courses.courseWork.studentSubmissions.list({
            courseId,
            courseWorkId,
            userId: googleId
          });

          if (!submissions.studentSubmissions?.[0]) {
            throw new Error(`No submission found for student ${studentId} (Google ID: ${googleId})`);
          }

          const submissionId = submissions.studentSubmissions[0].id;

          // Update grade - now including both assignedGrade and draftGrade
          await classroom.courses.courseWork.studentSubmissions.patch({
            courseId,
            courseWorkId,
            id: submissionId,
            updateMask: 'assignedGrade,draftGrade', // Update mask to include both
            requestBody: {
              assignedGrade: grade,
              draftGrade: grade    // Add draftGrade to match docs example
            }
          });

          return { studentId, googleId, success: true };
        } catch (error) {
          console.error('Failed to sync grade:', { studentId, error });
          return { 
            studentId,
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return NextResponse.json({ 
      success: true,
      results,
      summary: {
        total: grades.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Grade sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync grades' },
      { status: 500 }
    );
  }
}
