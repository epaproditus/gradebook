import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabaseConfig';

interface GradeSubmission {
  studentId: string;
  grade: number;
  period: string;
}

export async function POST(request: Request, context: { params: { courseId: string; assignmentId: string } }) {
  try {
    const { courseId, assignmentId } = context.params;
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { gradeId, grade } = await request.json();

    // First, get the student's Google ID from mappings
    const { data: gradeData, error: gradeError } = await supabase
      .from('grades')
      .select(`
        *,
        student_mappings!inner (
          google_id
        )
      `)
      .eq('id', gradeId)
      .single();

    if (gradeError || !gradeData?.student_mappings?.google_id) {
      return NextResponse.json({ 
        error: 'No valid mapping found',
        details: gradeError || 'Missing Google ID'
      }, { status: 404 });
    }

    // First, get the submission ID using the student's Google ID
    const submissionRes = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}/studentSubmissions?userId=${gradeData.student_mappings.google_id}`,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        }
      }
    );

    const submissionData = await submissionRes.json();
    
    if (!submissionData.studentSubmissions?.[0]?.id) {
      console.error('No submission found:', submissionData);
      return NextResponse.json({ 
        error: 'No submission found for student',
        courseId,
        assignmentId,
        googleId: gradeData.student_mappings.google_id
      }, { status: 404 });
    }

    // Now PATCH the submission with the grade
    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}/studentSubmissions/${submissionData.studentSubmissions[0].id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedGrade: Number(grade),
          draftGrade: Number(grade)
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('Google API Error:', data);
      throw new Error(data.error?.message || 'Failed to sync grade');
    }

    // Update local grade status
    await supabase
      .from('grades')
      .update({ 
        synced_to_google: true,
        last_sync: new Date().toISOString()
      })
      .eq('id', gradeId);

    return NextResponse.json({ 
      success: true,
      grade,
      submissionId: data.id
    });

  } catch (error) {
    console.error('Grade sync error:', error);
    return NextResponse.json({ 
      error: "Failed to sync grade",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ courseId: string; assignmentId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const params = await context.params;
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { grades } = await request.json() as { grades: { studentId: number, grade: number, period: string }[] };

    // Get the Google IDs directly from student_mappings
    const { data: mappings, error: mappingError } = await supabase
      .from('student_mappings')
      .select('student_id, google_id')
      .eq('period', grades[0].period)
      .in('student_id', grades.map(g => g.studentId));

    if (mappingError) {
      console.error('Failed to fetch mappings:', mappingError);
      return NextResponse.json({ error: 'Failed to fetch student mappings' }, { status: 500 });
    }

    // Create a lookup map for quick access
    const googleIdMap = new Map(
      mappings?.map(m => [m.student_id, m.google_id]) || []
    );

    // Map grades to Google IDs
    const gradesToSync = grades
      .filter(grade => googleIdMap.has(grade.studentId))
      .map(grade => ({
        studentId: googleIdMap.get(grade.studentId)!, // Use the Google ID from mappings
        grade: grade.grade
      }));

    console.log('Syncing grades with mappings:', {
      totalGrades: grades.length,
      foundMappings: mappings?.length || 0,
      gradesToSync: gradesToSync.length
    });

    // Initialize Classroom API and sync grades
    const classroom = google.classroom({ 
      version: 'v1',
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });

    // Submit grades with error tracking
    const results = await Promise.allSettled(
      gradesToSync.map(async (grade) => {
        try {
          return await classroom.courses.courseWork.studentSubmissions.patch({
            courseId: params.courseId,
            courseWorkId: params.assignmentId,
            id: `-`,
            updateMask: 'assignedGrade',
            requestBody: {
              assignedGrade: grade.grade,
              draftGrade: grade.grade
            }
          });
        } catch (error) {
          console.error('Grade submission error:', error);
          return null;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = grades.length - successful;

    return NextResponse.json({
      success: true,
      gradesSubmitted: successful,
      gradesFailed: failed,
      totalGrades: grades.length
    });

  } catch (error) {
    console.error('Grade sync error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync grades',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
