import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string; assignmentId: string }> }
) {
  try {
    const { courseId, assignmentId } = await context.params;
    const authHeader = request.headers.get("authorization");
    const { periods, subject } = await request.json(); // Now getting subject from request

    console.log('Import request:', {
      courseId,
      assignmentId,
      periods,
      subject,
      hasAuth: !!authHeader
    });

    if (!authHeader || !periods?.length) {
      return NextResponse.json({ 
        error: periods?.length ? "Unauthorized" : "No periods specified",
        success: false 
      }, { status: 401 });
    }

    // Get assignment details
    const assignmentRes = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}`,
      { 
        headers: { 
          Authorization: authHeader,
          Accept: 'application/json'
        },
        cache: 'no-store' // Prevent caching
      }
    );

    if (!assignmentRes.ok) {
      console.error('Failed to fetch assignment:', await assignmentRes.text());
      throw new Error('Failed to fetch assignment details');
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
    console.error('Detailed import error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Import failed",
      success: false,
      details: error
    }, { status: 500 });
  }
}