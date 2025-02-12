import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import LoadingSpinner from './ui/loading-spinner';
import { useSession } from 'next-auth/react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Define the correct types for Google Classroom API response
export interface GoogleAssignment {
  id: string;
  title: string;
  maxPoints?: number;
  creationTime?: string;
  updateTime: string;
  materials?: Array<{
    driveFile?: {
      driveFile: {
        id: string;
        title: string;
      };
    };
  }>;
  forceUpdate?: boolean;
}

interface AssignmentWithForce extends GoogleAssignment {
  forceUpdate?: boolean;
}

export interface Props {
  courseId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (assignment: AssignmentWithForce) => void;
}

export function AssignmentSelectDialog({ courseId, open, onClose, onSelect }: Props) {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<GoogleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<{ show: boolean; assignmentId: string | null }>({
    show: false,
    assignmentId: null
  });

  useEffect(() => {
    async function fetchAssignments() {
      if (!session?.accessToken) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(`/api/classroom/${courseId}/assignments?pageSize=20`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch assignments');
        }

        const data = await res.json();
        setAssignments(data.courseWork || []);
      } catch (error) {
        console.error('Error:', error);
        setError(error instanceof Error ? error.message : 'Failed to load assignments');
      } finally {
        setLoading(false);
      }
    }

    if (open) {
      fetchAssignments();
    }
  }, [courseId, session?.accessToken, open]);

  const filteredAssignments = assignments.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssignmentClick = async (assignment: GoogleAssignment) => {
    if (!session?.accessToken) return;
    onSelect({ ...assignment, forceUpdate: false });
    onClose();
  };

  const handleReimport = () => {
    const assignment = assignments.find(a => a.id === duplicateAlert.assignmentId);
    if (assignment) {
      onSelect({ ...assignment, forceUpdate: true });
      onClose();
    }
    setDuplicateAlert({ show: false, assignmentId: null });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Assignment to Import</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Search assignments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {loading ? (
              <div className="flex justify-center p-8">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="text-red-500 text-center p-4">{error}</div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto space-y-2">
                {filteredAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleAssignmentClick(assignment)}
                  >
                    <div>
                      <h3 className="font-medium">{assignment.title}</h3>
                      <p className="text-sm text-gray-500">
                        Max Points: {assignment.maxPoints || 100}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(assignment.updateTime).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {filteredAssignments.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No assignments found
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog 
        open={duplicateAlert.show} 
        onOpenChange={(open) => !open && setDuplicateAlert({ show: false, assignmentId: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assignment Already Imported</AlertDialogTitle>
            <AlertDialogDescription>
              This assignment has already been imported. Would you like to re-import it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReimport}>
              Re-import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
