import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import ClientHomeWrapper from '@/components/ClientHomeWrapper';

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Auth error:', error);
    return redirect('/auth/signin');
  }

  if (!session) {
    return redirect('/auth/signin');
  }

  // Get teacher status
  const { data: teacher } = await supabase
    .from('teachers')
    .select('email')
    .eq('email', session.user.email)
    .maybeSingle();

  // Check if user is a teacher
  const isTeacher = !!teacher;

  return <ClientHomeWrapper isTeacher={isTeacher} />;
}
