'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

export default function TokenDebug() {
  const { data: session } = useSession();

  if (!session) return null;

  const copyToken = () => {
    if (session.accessToken) {
      navigator.clipboard.writeText(session.accessToken);
    }
  };

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Auth Debug Info</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={copyToken}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy Token
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-red-500 mb-2">
          ⚠️ Warning: Never share or commit these tokens
        </div>
        <pre className="text-xs bg-slate-50 p-4 rounded overflow-auto">
          {JSON.stringify({
            user: session.user?.email,
            expires: session.expires,
            accessToken: session.accessToken,
          }, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
