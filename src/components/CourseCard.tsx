import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StudentMappingModal } from './StudentMappingModal';
import type { StudentMapping } from '../types/studentMapping';

interface CourseCardProps {
  name: string;
  section?: string;
  id: string;
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

export function CourseCard({ name, section, id }: CourseCardProps) {
  const { data: session } = useSession();
  const [showAssignments, setShowAssignments] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMapping, setShowMapping] = useState(false);
  const [studentMappings, setStudentMappings] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<{[key: string]: 'success' | 'error' | null}>({});
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filteredAssignments = assignments.filter(assignment => 
    assignment.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDueDate = (dueDate?: Assignment['dueDate']) => {
    if (!dueDate) return 'No due date';
    return new Date(dueDate.year, dueDate.month - 1, dueDate.day).toLocaleDateString();
  };

  const loadAssignments = async (pageToken?: string) => {
    try {
      const url = new URL(`/api/classroom/${id}/assignments`, window.location.origin);
      url.searchParams.set('pageSize', '5');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch assignments');
      
      const data = await res.json();
      
      if (pageToken) {
        setAssignments(prev => [...prev, ...(data.courseWork || [])]);
      } else {
        setAssignments(data.courseWork || []);
      }
      setNextPageToken(data.nextPageToken);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleAssignments = async () => {
    setShowAssignments(!showAssignments);
    if (!assignments.length && session?.accessToken) {
      await loadAssignments();
    }
  };

  const handleLoadMore = async () => {
    if (!nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);
    await loadAssignments(nextPageToken);
  };

  const handleImportAssignment = async (assignment: Assignment) => {
    try {
      setImportStatus(prev => ({ ...prev, [assignment.id]: null }));
      
      // Direct import without student mapping
      const res = await fetch(`/api/classroom/${id}/assignments/${assignment.id}/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) throw new Error('Failed to import');
      
      const data = await res.json();
      setImportStatus(prev => ({ ...prev, [assignment.id]: 'success' }));
      
      // Optional: Show success message or redirect to gradebook
      // window.location.href = `/gradebook?assignment=${data.assignment.id}`;
      
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus(prev => ({ ...prev, [assignment.id]: 'error' }));
    }
  };

  const handleConfirmMapping = async (mappings: StudentMapping[]) => {
    if (!selectedAssignment) return;
    
    try {
      setImportStatus(prev => ({ ...prev, [selectedAssignment.id]: null }));
      
      const res = await fetch(`/api/classroom/${id}/assignments/${selectedAssignment.id}/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentMappings: mappings })
      });

      if (!res.ok) throw new Error('Failed to import with mappings');
      
      setImportStatus(prev => ({ ...prev, [selectedAssignment.id]: 'success' }));
      setShowMapping(false);
      
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus(prev => ({ ...prev, [selectedAssignment.id]: 'error' }));
    }
  };

  return (
    <>
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
                    variant={importStatus[assignment.id] === 'success' ? "ghost" : "default"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImportAssignment(assignment);
                    }}
                    className="mt-2"
                    disabled={importStatus[assignment.id] === 'success'}
                  >
                    {importStatus[assignment.id] === 'success' ? 
                      '✓ Imported' : 
                      importStatus[assignment.id] === 'error' ? 
                        'Retry Import' : 
                        'Import to Gradebook'}
                  </Button>
                </div>
              ))}
              {nextPageToken && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full mt-4"
                >
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner className="mr-2" />
                      <span>Loading more...</span>
                    </div>
                  ) : (
                    'Load more assignments'
                  )}
                </Button>
              )}
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
      </Card>

      <StudentMappingModal
        open={showMapping}
        onClose={() => setShowMapping(false)}
        students={studentMappings}
        onConfirm={handleConfirmMapping}
      />
    </>
  );
}
