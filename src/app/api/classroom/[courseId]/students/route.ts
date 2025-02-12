import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseConfig';

export async function GET(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await context.params;
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader) {
    console.error('Missing auth header');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First get gradebook students
    const { data: gradebookStudents, error: dbError } = await supabase
      .from('students')
      .select('id, name, class_period, google_id, google_email')
      .order('name');

    if (dbError) throw dbError;
    
    // Fetch Google Classroom students with full profile
    const googleRes = await fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/students?fields=students.userId,students.profile.name,students.profile.emailAddress`,
      { 
        headers: { 
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      }
    );

    const googleData = await googleRes.json();

    if (!googleRes.ok) {
      console.error('Google API error:', googleData);
      throw new Error(googleData.error?.message || 'Failed to fetch Google students');
    }

    console.log('Raw Google response:', JSON.stringify(googleData, null, 2));

    // Map the students with better error handling
    const mappedStudents = (googleData.students || []).map(gStudent => {
      try {
        // Extract name components
        const { givenName, familyName } = gStudent.profile.name;
        
        // Generate email pattern (firstname.lastname)
        const expectedEmail = `${givenName.toLowerCase()}.${familyName.toLowerCase()}`;
        
        // Try to find matching student
        const matchedStudent = gradebookStudents?.find(s => {
          if (!s.name) return false;
          
          // Parse gradebook name (LASTNAME, FIRSTNAME M)
          const [lastName = '', firstName = ''] = s.name.split(',').map(part => 
            part.trim().toLowerCase().replace(/\s+.*$/, '') // Remove middle initial/name
          );
          
          // Match by name pattern
          return firstName === givenName.toLowerCase() && 
                 lastName === familyName.toLowerCase();
        });

        console.log('Matching result:', {
          googleName: `${givenName} ${familyName}`,
          matched: matchedStudent?.name,
          expectedEmail
        });

        return {
          googleId: gStudent.userId,
          googleName: `${givenName} ${familyName}`,
          googleEmail: expectedEmail,
          matchedStudent: matchedStudent ? {
            id: matchedStudent.id,
            name: matchedStudent.name,
            period: matchedStudent.class_period
          } : undefined
        };
      } catch (err) {
        console.error('Error mapping student:', gStudent, err);
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({ 
      students: mappedStudents,
      gradebookStudents: gradebookStudents || []
    });
  } catch (error) {
    console.error('Handler error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to fetch students",
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
