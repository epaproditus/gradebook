'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Seating arrangement error:', error);
  }, [error]);

  return (
    <div className="p-4">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Something went wrong!</h2>
        <p className="text-red-600 mb-4">{error.message}</p>
        <div className="flex gap-4">
          <Button
            onClick={() => window.location.reload()}
            variant="default"
          >
            Try reloading
          </Button>
          <Button
            onClick={reset}
            variant="outline"
          >
            Try again
          </Button>
        </div>
      </Card>
    </div>
  );
}
