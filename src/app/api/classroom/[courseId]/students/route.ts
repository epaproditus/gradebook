import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

interface GoogleClassroomStudent {
  userId: string;
  profile: {
    name: {
      givenName: string;
      familyName: string;
      fullName: string;
    };
    emailAddress: string;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params;
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
  }

  try {
    // First get the course mapping to check period
    const { data: mapping } = await supabase
      .from('course_mappings')
      .select('period')
      .eq('google_course_id', courseId)
      .single();

    // Get Google Classroom students
    console.log('Fetching Google students with auth:', authHeader?.substring(0, 20) + '...');
    
    const googleRes = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/students`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
        cache: 'no-store'
      }
    );

    const googleData = await googleRes.json();

    if (!googleRes.ok) {
      console.error('Google API error:', googleData);
      throw new Error(googleData.error?.message || 'Failed to fetch Google students');
    }

    console.log('Raw Google response:', JSON.stringify(googleData, null, 2));

    // Get gradebook students for matching
    const { data: gradebookStudents, error: dbError } = await supabase
      .from('students')
      .select('*')
      .order('name');

    if (dbError) throw dbError;

    // Get existing mappings
    const { data: existingMappings } = await supabase
      .from('student_mappings')
      .select('*')
      .eq('period', mapping?.period);

    // Format Google students data
    const formattedStudents = googleData.students?.map((s: GoogleClassroomStudent) => ({
      googleId: s.userId,
      googleEmail: s.profile?.emailAddress || '', // Make email optional
      googleName: {
        givenName: s.profile.name.givenName,
        familyName: s.profile.name.familyName,
        fullName: s.profile.name.fullName
      }
    })) || [];

    return NextResponse.json({
      students: formattedStudents,
      gradebookStudents
    });
  } catch (error) {
    console.error('Handler error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch students' },
      { status: 500 }
    );
  }
}
