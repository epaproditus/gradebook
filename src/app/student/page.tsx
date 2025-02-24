import { StudentDashboard } from '@/components/StudentDashboard';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function StudentPage() {
  // Initialize Supabase client with awaited cookies
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ 
    cookies: () => cookieStore 
  });

  // Get session
  const { data: { session } } = await supabase.auth.getSession();
  
  // Protect route
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return (
    <div>
      <StudentDashboard />
    </div>
  );
}
