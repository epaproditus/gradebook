import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CourseCardProps {
  name: string;
  section?: string;
  id: string;
  onSync: (courseId: string) => Promise<void>;
}

interface Assignment {
  id: string;
  title: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  workType?: string;
  maxPoints?: number;
  state?: 'PUBLISHED' | 'DRAFT';
  description?: string;
  materials?: Array<{
    driveFile?: {
      driveFile: {
        title: string;
        url: string;
      }
    }
  }>;
}

export function CourseCard({ name, section, id, onSync }: CourseCardProps) {
  const { data: session } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssignments = assignments.filter(assignment => 
    assignment.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSync(id);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDueDate = (dueDate?: Assignment['dueDate']) => {
    if (!dueDate) return 'No due date';
    return new Date(dueDate.year, dueDate.month - 1, dueDate.day).toLocaleDateString();
  };

  const toggleAssignments = async () => {
    setShowAssignments(!showAssignments);
    if (!assignments.length && session?.accessToken) {
      try {
        const res = await fetch(`/api/classroom/${id}/assignments`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch assignments');
        }
        
        const data = await res.json();
        setAssignments(data.courseWork || []);
      } catch (error) {
        console.error('Error fetching assignments:', error);
      }
    }
  };

  const handleImportAssignment = async (assignment: Assignment) => {
    try {
      const res = await fetch(`/api/classroom/${id}/assignments/${assignment.id}/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: assignment.title,
          dueDate: assignment.dueDate,
          maxPoints: assignment.maxPoints
        })
      });

      if (!res.ok) throw new Error('Failed to import');
      // Add success notification here
    } catch (error) {
      console.error('Import error:', error);
      // Add error notification here
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
        <div className="space-y-4">
          <Input
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          
          <div className="space-y-2">
            {filteredAssignments.sort((a, b) => {
              if (!a.dueDate) return 1;
              if (!b.dueDate) return -1;
              return new Date(b.dueDate.year, b.dueDate.month - 1, b.dueDate.day).getTime() -
                     new Date(a.dueDate.year, a.dueDate.month - 1, a.dueDate.day).getTime();
            }).map((assignment) => (
              <div 
                key={assignment.id}
                className="p-4 bg-gray-50 rounded-md text-sm space-y-1 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => setSelectedAssignment(assignment)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{assignment.title}</h4>
                    <p className="text-gray-500 text-xs">
                      Due: {formatDueDate(assignment.dueDate)}
                    </p>
                  </div>
                  {assignment.maxPoints && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {assignment.maxPoints} points
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImportAssignment(assignment);
                  }}
                  className="mt-2"
                >
                  Import to Gradebook
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAssignment?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Due Date</h4>
              <p>{formatDueDate(selectedAssignment?.dueDate)}</p>
            </div>
            {selectedAssignment?.description && (
              <div>
                <h4 className="font-medium">Description</h4>
                <p className="whitespace-pre-wrap">{selectedAssignment.description}</p>
              </div>
            )}
            {selectedAssignment?.materials && selectedAssignment.materials.length > 0 && (
              <div>
                <h4 className="font-medium">Materials</h4>
                <ul className="list-disc pl-4">
                  {selectedAssignment.materials.map((material, index) => (
                    material.driveFile && (
                      <li key={index}>
                        <a 
                          href={material.driveFile.driveFile.url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {material.driveFile.driveFile.title}
                        </a>
                      </li>
                    )
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
