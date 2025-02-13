import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    // Handle auth and params concurrently
    const [session, { courseId }] = await Promise.all([
      getServerSession(authOptions),
      context.params
    ]);

    if (!session?.accessToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!courseId) {
      return Response.json({ error: 'Missing courseId' }, { status: 400 });
    }

    // Get request data
    const { assignmentName } = await request.json();
    if (!assignmentName) {
      return Response.json({ error: 'Missing assignmentName' }, { status: 400 });
    }

    try {
      // Check if course exists first
      const courseResponse = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          }
        }
      );

      if (!courseResponse.ok) {
        const error = await courseResponse.json();
        throw new Error(error.error?.message || 'Failed to verify course');
      }

      // Then get coursework
      const courseworkResponse = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/json',
          }
        }
      );

      if (!courseworkResponse.ok) {
        const error = await courseworkResponse.json();
        throw new Error(error.error?.message || 'Failed to fetch coursework');
      }

      const { courseWork = [] } = await courseworkResponse.json();
      
      // Find exact match first
      const existingWork = courseWork.find((work: any) => 
        work.title === assignmentName
      );

      // If found, get submission details
      if (existingWork) {
        console.log('Found coursework:', {
          id: existingWork.id,
          title: existingWork.title,
          maxPoints: existingWork.maxPoints,
          state: existingWork.state
        });

        return Response.json({
          courseWorkId: existingWork.id,
          alternateLink: existingWork.alternateLink,
          maxPoints: existingWork.maxPoints,
          state: existingWork.state
        });
      }

      console.log('No matching coursework found for:', assignmentName);
      return Response.json({ 
        error: 'Assignment not found in Google Classroom',
        availableAssignments: courseWork.map((w: any) => w.title)
      }, { 
        status: 404 
      });

    } catch (apiError) {
      console.error('Google Classroom API Error:', apiError);
      throw new Error(
        apiError instanceof Error ? 
          apiError.message : 
          'Failed to communicate with Google Classroom'
      );
    }

  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Failed to process request' 
    }, { 
      status: 500 
    });
  }
}
