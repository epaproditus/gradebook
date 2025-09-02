'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/components/ui/use-toast";  // Updated import
import { useEffect } from 'react';

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  useEffect(() => {
    // Clear any existing session on mount
    const clearSession = async () => {
      await supabase.auth.signOut();
    };
    clearSession();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign in. Please try again."
      });
    }
  };

  const getErrorMessage = () => {
    console.log('Error params:', {
      error,
      errorCode,
      errorDescription,
      searchParams: Object.fromEntries(searchParams.entries())
    });

    if (error === 'no_code') return 'Authentication failed. Please try again.';
    if (error === 'auth_error') return 'Authentication error. Please try again.';
    if (errorCode === 'signup_disabled') {
      return 'Sign-ups are currently disabled. Please contact your administrator.';
    }
    if (error === 'access_denied') {
      return 'Access was denied. Please use your school email account.';
    }
    if (error === 'session') {
      return 'Your session has expired. Please sign in again.';
    }
    if (errorDescription) {
      return decodeURIComponent(errorDescription).replace(/\+/g, ' ');
    }
    return 'An error occurred during sign in. Please try again.';
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Student Sign In</CardTitle>
          <CardDescription>
                                      Sign in with your school Google account
                          
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(error || errorCode) && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage()}
              </AlertDescription>
            </Alert>
          )}
          <Button 
            onClick={handleGoogleSignIn}
            className="w-full"
          >
            Sign in with Google
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Only authorized accounts are allowed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
