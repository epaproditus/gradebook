'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SignOutButtonProps {
  className?: string;
  variant?: 'default' | 'dark';
}

export function SignOutButton({ className, variant = 'default' }: SignOutButtonProps) {
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
        "gap-2",
        // Default (light) mode styling
        variant === 'default' && "border-gray-200 hover:bg-gray-100",
        // Dark mode styling
        variant === 'dark' && "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white",
        className
      )}
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  );
}
