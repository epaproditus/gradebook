import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Fetch Google Classroom students
    const res = await fetch(
      `https://classroom.googleapis.com/v1/courses/${params.courseId}/students`,
      {
        headers: { Authorization: authHeader }
      }
    );
    const data = await res.json();

    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch students');

    // Get existing students from your gradebook
    const { data: gradebookStudents } = await supabase
      .from('students')
      .select('*');

    // Map Google Classroom students to your students
    const mappedStudents = data.students?.map((gStudent: any) => {
      const email = gStudent.profile.emailAddress;
      const matchingStudent = gradebookStudents?.find(s => 
        email.startsWith(`${s.name.toLowerCase().split(' ')[0]}.${s.name.toLowerCase().split(' ')[1]}`)
      );
      
      return {
        googleId: gStudent.userId,
        email: email,
        name: gStudent.profile.name.fullName,
        matched: !!matchingStudent,
        gradebookId: matchingStudent?.id
      };
    });

    return NextResponse.json({ students: mappedStudents });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}
