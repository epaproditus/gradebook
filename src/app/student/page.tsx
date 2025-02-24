import { StudentDashboard } from '@/components/StudentDashboard';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function StudentPage() {
  // Initialize Supabase client
  const supabase = createServerComponentClient({ cookies });

  // Get session first
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  // Now that we know we have a session, render the dashboard
  return (
    <div>
      <StudentDashboard />
    </div>
  );
}
