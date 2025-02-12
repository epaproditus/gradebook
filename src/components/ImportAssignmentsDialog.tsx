import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSession } from 'next-auth/react';
import LoadingSpinner from './ui/loading-spinner';

interface Assignment {
  id: string;
  title: string;
  maxPoints: number;
  dueDate?: {
    month: number;
    day: number;
    year: number;
  };
}

export function ImportAssignmentsDialog({ 
  courseId, 
  period,
  open, 
  onClose 
}: { 
  courseId: string;
  period: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch(`/api/classroom/${courseId}/assignments`, {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`
          }
        });
        
        const data = await res.json();
        setAssignments(data.courseWork || []);
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    }

    if (open) fetchAssignments();
  }, [courseId, open, session?.accessToken]);

  const handleImport = async (assignmentId: string) => {
    try {
      const res = await fetch(
        `/api/classroom/${courseId}/assignments/${assignmentId}/import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.accessToken}`
          },
          body: JSON.stringify({ period })
        }
      );

      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 400 && data.error === "Assignment already imported") {
          console.log('Assignment was already imported');
          // Remove from list but don't show error
          setAssignments(assignments.filter(a => a.id !== assignmentId));
          return;
        }
        throw new Error(data.error || 'Import failed');
      }

      // Show success message and remove from list
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      // Optionally show a success toast or message
    } catch (error) {
      console.error('Error importing assignment:', error);
      // Optionally show error message to user
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import Assignments</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto">
          {loading ? (
            <LoadingSpinner />
          ) : assignments.length === 0 ? (
            <p>No assignments found</p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{assignment.title}</h3>
                    <p className="text-sm text-gray-500">
                      Points: {assignment.maxPoints}
                    </p>
                  </div>
                  <Button onClick={() => handleImport(assignment.id)}>
                    Import
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
