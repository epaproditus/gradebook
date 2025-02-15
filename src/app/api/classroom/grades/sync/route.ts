import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Get session and access token
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" }, 
        { status: 401 }
      );
    }

    // Get grades from request body
    const { grades } = await req.json();
    if (!grades || !Array.isArray(grades)) {
      return NextResponse.json(
        { error: "Invalid request body" }, 
        { status: 400 }
      );
    }

    // For each grade, submit to Google Classroom
    const results = await Promise.all(grades.map(async (grade) => {
      const { courseId, courseWorkId, userId, assignedGrade } = grade;
      
      try {
        const response = await fetch(
          `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${userId}`, 
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              assignedGrade,
              draftGrade: assignedGrade
            })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message);
        }

        return { success: true, userId };

      } catch (error) {
        console.error('Failed to sync grade:', error);
        return { 
          success: false, 
          userId,
          error: error instanceof Error ? error.message : 'Failed to sync grade'
        };
      }
    }));

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync grades' },
      { status: 500 }
    );
  }
}
