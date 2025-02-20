'use client';

import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });

  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Check user's role by their email domain
  const userEmail = session.user?.email;
  const isStudent = userEmail?.endsWith('@eeisd.org') && !userEmail?.includes('teacher');

  if (isStudent) {
    redirect('/students');
  } else {
    redirect('/gradebook');
  }

  // This will never be reached but is needed for TypeScript
  return null;
}
