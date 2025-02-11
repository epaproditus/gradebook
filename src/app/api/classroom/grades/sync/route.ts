import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all courses first
    const coursesRes = await fetch("https://classroom.googleapis.com/v1/courses", {
      headers: { Authorization: authHeader }
    });
    const coursesData = await coursesRes.json();
    
    if (!coursesRes.ok) {
      throw new Error(coursesData.error?.message || "Failed to fetch courses");
    }

    const courses = coursesData.courses || [];
    const allGrades = [];

    // Fetch grades for each course
    for (const course of courses) {
      const gradeRes = await fetch(
        `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`,
        { headers: { Authorization: authHeader } }
      );
      const gradeData = await gradeRes.json();
      
      if (gradeRes.ok) {
        allGrades.push(...(gradeData.courseWork || []));
      }
    }

    return NextResponse.json({ success: true, grades: allGrades });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to sync grades" },
      { status: 500 }
    );
  }
}
