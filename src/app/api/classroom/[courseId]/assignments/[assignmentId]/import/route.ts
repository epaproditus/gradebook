import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string; assignmentId: string }> }
) {
  try {
    const { courseId, assignmentId } = await context.params;
    const { periods, subject, accessToken } = await request.json();

    // Try multiple auth methods
    let authHeader = request.headers.get("authorization");
    if (!authHeader && accessToken) {
      authHeader = `Bearer ${accessToken}`;
    }

    if (!authHeader) {
      // Try getting token from session as last resort
      const session = await getServerSession(authOptions);
      if (session?.accessToken) {
        authHeader = `Bearer ${session.accessToken}`;
      }
    }

    console.log('Auth header exists:', !!authHeader);

    if (!authHeader || !periods?.length) {
      return NextResponse.json({ 
        error: "Auth or periods missing",
        success: false,
        hasAuth: !!authHeader,
        hasPeriods: !!periods?.length
      }, { status: 401 });
    }

    // Get assignment with error handling
    try {
      const assignmentRes = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}`,
        { 
          headers: { 
            'Authorization': authHeader,
            'Accept': 'application/json'
          },
          cache: 'no-store'
        }
      );

      if (!assignmentRes.ok) {
        const errorText = await assignmentRes.text();
        console.error('Google API Error:', {
          status: assignmentRes.status,
          statusText: assignmentRes.statusText,
          error: errorText
        });
        
        if (assignmentRes.status === 401) {
          return NextResponse.json({ 
            error: "Session expired", 
            needsReauth: true 
          }, { status: 401 });
        }
        
        throw new Error(`Failed to fetch assignment: ${errorText}`);
      }

      const targetAssignment = await assignmentRes.json();

      if (!targetAssignment?.title) {
        return NextResponse.json({
          error: "Failed to fetch assignment",
          success: false
        }, { status: 404 });
      }

      console.log('Found target assignment:', {
        title: targetAssignment.title,
        maxPoints: targetAssignment.maxPoints
      });

      // Get all mapped courses (both source and potential targets)
      const { data: courseMappings } = await supabase
        .from('course_mappings')
        .select('google_course_id, period')
        .eq('setup_completed', true)
        .not('google_course_id', 'is', null);

      if (!courseMappings?.length) {
        return NextResponse.json({
          error: "No mapped courses found",
          success: false
        }, { status: 404 });
      }

      // Start with just the selected periods
      const matchingPeriods = new Set(periods);
      console.log('Initial periods:', Array.from(matchingPeriods));

      // Check each mapped course for the assignment
      for (const mapping of courseMappings) {
        // Skip the source course
        if (mapping.google_course_id === courseId) {
          console.log(`Skipping source course ${courseId}`);
          continue;
        }

        try {
          // Check if this course has the same assignment
          const assignmentRes = await fetch(
            `https://classroom.googleapis.com/v1/courses/${mapping.google_course_id}/courseWork`,
            { headers: { Authorization: authHeader } }
          );

          if (!assignmentRes.ok) continue;

          const { courseWork } = await assignmentRes.json();
          
          // Look for matching assignment by title and points
          const hasMatch = courseWork?.some(work => 
            work.title === targetAssignment.title &&
            work.maxPoints === targetAssignment.maxPoints
          );

          if (hasMatch) {
            console.log(`Found match in course ${mapping.google_course_id}, adding period ${mapping.period}`);
            matchingPeriods.add(mapping.period);
          }
        } catch (err) {
          console.warn(`Failed to check course ${mapping.google_course_id}:`, err);
        }
      }

      console.log('Final matching periods before save:', Array.from(matchingPeriods));

      // Create/update the assignment with verified periods
      const { data: savedAssignment, error } = await supabase
        .from('assignments')
        .upsert({
          name: targetAssignment.title,
          date: new Date(targetAssignment.creationTime || Date.now()).toISOString().split('T')[0],
          type: 'Daily',
          periods: Array.from(matchingPeriods),
          subject: subject || 'Math 8', // Use provided subject with fallback
          max_points: targetAssignment.maxPoints || 100,
          google_classroom_link: targetAssignment.alternateLink || null
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save assignment:', error);
        throw error;
      }

      console.log('Successfully saved assignment:', savedAssignment);

      return NextResponse.json({ 
        success: true,
        assignment: savedAssignment,
        periodsFound: Array.from(matchingPeriods)
      });

    } catch (error) {
      console.error('Assignment fetch error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Detailed import error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Import failed",
      success: false,
      details: error
    }, { status: 500 });
  }
}