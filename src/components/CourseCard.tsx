import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useSession } from 'next-auth/react';

interface CourseCardProps {
  name: string;
  section?: string;
  id: string;
  onSync: (courseId: string) => Promise<void>;
}

export function CourseCard({ name, section, id, onSync }: CourseCardProps) {
  const { data: session } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSync(id);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleAssignments = async () => {
    setShowAssignments(!showAssignments);
    if (!assignments.length) {
      const res = await fetch(`/api/classroom/${id}/assignments`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`
        }
      });
      const data = await res.json();
      setAssignments(data.courseWork || []);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{name}</h3>
          {section && <p className="text-sm text-gray-500">{section}</p>}
        </div>
        <Button 
          onClick={toggleAssignments}
          variant="outline"
          size="sm"
        >
          {showAssignments ? 'Hide' : 'View'} Assignments
        </Button>
      </div>
      
      {showAssignments && (
        <div className="mt-4 space-y-2">
          {assignments.map((assignment) => (
            <div 
              key={assignment.id}
              className="p-2 bg-gray-50 rounded-md text-sm"
            >
              {assignment.title}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end items-center gap-2">
        {isSyncing && <LoadingSpinner />}
        <Button 
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? 'Syncing...' : 'Sync Assignments'}
        </Button>
      </div>
    </Card>
  );
}
