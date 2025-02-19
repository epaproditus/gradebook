import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=no_code`);
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=session`);
    }

    // Check if user is a teacher
    const { data: teacher } = await supabase
      .from('teachers')
      .select('*')
      .eq('email', session.user.email)
      .single();

    if (teacher) {
      return NextResponse.redirect(`${baseUrl}/gradebook`);
    }

    // If not a teacher, check if user is a student
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('google_email', session.user.email)
      .single();

    if (student) {
      if (!student.google_id) {
        await supabase
          .from('students')
          .update({ google_id: session.user.id })
          .eq('id', student.id);
      }
      return NextResponse.redirect(`${baseUrl}/student`);
    }

    // Neither teacher nor student
    return NextResponse.redirect(`${baseUrl}/auth/not-authorized`);

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/signin?error=unknown`);
  }
}
