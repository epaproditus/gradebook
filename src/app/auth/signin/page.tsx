'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SignIn() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/classroom';
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Sign in to Gradebook</h1>
        <Button
          onClick={() => signIn('google', { callbackUrl })}
          className="flex items-center gap-2"
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
