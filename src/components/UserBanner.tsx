'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function UserBanner() {
  const [userType, setUserType] = useState<'teacher' | 'student' | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
        
        // Check if teacher
        const { data: teacher } = await supabase
          .from('teachers')
          .select('email')
          .eq('email', session.user.email)
          .maybeSingle();

        if (teacher) {
          setUserType('teacher');
          return;
        }

        // Check if student
        const { data: student } = await supabase
          .from('student_mappings')
          .select('google_email')
          .eq('google_email', session.user.email)
          .maybeSingle();

        if (student) {
          setUserType('student');
        }
      }
    }

    checkUser();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all cookies
      const cookieNames = document.cookie.split(';').map(cookie => cookie.split('=')[0].trim());
      cookieNames.forEach(name => {
        if (name.startsWith('sb-')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
      });

      // Force reload to clear any cached auth state
      window.location.href = '/auth/signin';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!email || !userType) return null;

  return (
    <div className="bg-secondary px-4 py-2 flex justify-between items-center">
      <span className="text-sm">
        Signed in as: <span className="font-medium">{email}</span> ({userType})
      </span>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={handleSignOut}
      >
        Sign Out
      </Button>
    </div>
  );
}
