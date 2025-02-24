'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignOut = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      // Sign out from NextAuth
      await signOut({ redirect: true, callbackUrl: '/' });
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSignOut}
      className={cn(
        "gap-2 bg-black hover:bg-zinc-900 border-zinc-800",
        className
      )}
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  );
}
