import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string; assignmentId: string }> }
) {
  const { courseId, assignmentId } = await context.params;
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { gradeId, grade } = await request.json();

    // Get the grade from our database
    const { data: gradeData } = await supabase
      .from('grades')
      .select('*, students(google_id)')
      .eq('id', gradeId)
      .single();

    if (!gradeData?.students?.google_id) {
      throw new Error('Student not mapped to Google Classroom');
    }

    // Update grade in Google Classroom
    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}/studentSubmissions/lookup?userId=${gradeData.students.google_id}`,
      {
        method: 'POST',
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

    if (!res.ok) {
      throw new Error('Failed to sync grade to Google Classroom');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Grade sync error:', error);
    return NextResponse.json({ error: "Failed to sync grade" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ courseId: string; assignmentId: string }> }
) {
  try {
    // Handle all async operations first
    const [token, { courseId, assignmentId }, { grades }] = await Promise.all([
      getToken({ req: request as any }),
      context.params,
      request.json()
    ]);

    if (!token?.accessToken) {
      return Response.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    console.log('Processing grades:', {
      courseId,
      assignmentId,
      sampleGrades: Object.entries(grades).slice(0, 3)
    });

    // Get student mappings with direct Supabase client
    const { data: studentMappings, error: mappingError } = await supabase
      .from('students')
      .select('id, google_id, name')
      .in('id', Object.keys(grades));

    if (mappingError || !studentMappings?.length) {
      console.error('Student mapping error:', {
        error: mappingError,
        studentIds: Object.keys(grades),
        foundMappings: studentMappings?.length || 0
      });
      return Response.json({ 
        error: 'Failed to find Google Classroom mappings for students',
        details: {
          lookingFor: Object.keys(grades),
          found: studentMappings?.map(s => ({ id: s.id, name: s.name }))
        }
      }, { status: 400 });
    }

    // Create Google ID mapping
    const studentIdToGoogleId = studentMappings.reduce((acc, student) => {
      if (student.google_id) {
        acc[student.id] = student.google_id;
      }
      return acc;
    }, {} as Record<string, string>);

    // Get submissions from Google Classroom
    const listResponse = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}/studentSubmissions`,
      {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!listResponse.ok) {
      throw new Error(`Failed to fetch submissions: ${await listResponse.text()}`);
    }

    const { studentSubmissions } = await listResponse.json();

    // Process each grade
    const updatePromises = Object.entries(grades).map(async ([studentId, grade]) => {
      const googleId = studentIdToGoogleId[studentId];
      if (!googleId) {
        console.warn(`No Google ID found for student ${studentId}`);
        return null;
      }

      const submission = studentSubmissions?.find(
        (sub: any) => sub.userId === googleId
      );

      if (!submission) {
        console.warn(`No submission found for student ${studentId} (Google ID: ${googleId})`);
        return null;
      }

      console.log('Updating grade:', {
        studentId,
        googleId,
        submissionId: submission.id,
        grade,
        studentName: studentMappings.find(s => s.id === studentId)?.name
      });

      // Update grade in Google Classroom
      const response = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}/studentSubmissions/${submission.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            draftGrade: parseFloat(String(grade)),
            assignedGrade: parseFloat(String(grade)),
            updateMask: 'assignedGrade,draftGrade'
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Grade update failed:', error);
        throw new Error(`Failed to update grade for student ${studentId}`);
      }

      return response.json();
    });

    const results = (await Promise.all(updatePromises)).filter(Boolean);

    return Response.json({ 
      message: 'Grades synced successfully',
      updated: results.length,
      total: Object.keys(grades).length,
      mappingStats: {
        studentsWithGoogleIds: Object.keys(studentIdToGoogleId).length,
        totalStudents: studentMappings.length
      }
    });

  } catch (error) {
    console.error('Error syncing grades:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to sync grades' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
