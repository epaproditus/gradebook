'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function NotFound() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Student Account Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>No student record was found for:</p>
            {email && (
              <p className="font-mono bg-slate-100 p-2 rounded">
                {email}
              </p>
            )}
            <p>This could be because:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your email is not yet mapped in the system</li>
              <li>You're using a different email than your school record</li>
              <li>Your student record hasn't been imported</li>
            </ul>
          </div>
          <Button asChild className="w-full mt-4">
            <Link href="/auth/signin">Try Again</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
