import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';

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
  request: NextRequest,
  { params }: { params: { courseId: string; assignmentId: string } }
) {
  try {
    console.log('Received sync request for:', params);

    const session = await getServerSession();
    if (!session?.accessToken) {
      console.log('No access token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { grades } = await request.json();
    console.log('Received grades to sync:', {
      studentCount: Object.keys(grades).length,
      courseId: params.courseId,
      assignmentId: params.assignmentId
    });

    // Map grades to Google Classroom format
    const submissions = Object.entries(grades).map(([userId, grade]) => ({
      userId,
      draftGrade: parseInt(String(grade)),
      assignedGrade: parseInt(String(grade))
    }));

    console.log('Submitting to Google Classroom:', { submissionCount: submissions.length });

    const response = await fetch(
      `https://classroom.googleapis.com/v1/courses/${params.courseId}/courseWork/${params.assignmentId}/studentSubmissions:modifyGrades`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ submissions }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Google Classroom API error: ${errorText}`);
    }

    const result = await response.json();
    console.log('Sync successful:', result);

    return NextResponse.json({ 
      message: 'Grades synced successfully',
      result 
    });
  } catch (error) {
    console.error('Error syncing grades:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync grades' }, 
      { status: 500 }
    );
  }
}
