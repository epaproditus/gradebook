import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from './ui/button';
import LoadingSpinner from './ui/loading-spinner';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";

interface Assignment {
  id: string;
  title: string;
  maxPoints: number;
  createdDate: string;
}

interface CourseAssignmentsProps {
  courseId: string;
  period: string;
  isExpanded: boolean;
  onToggle: () => void;
  onImport?: () => void;
}

export function CourseAssignments({ 
  courseId, 
  period,
  isExpanded,
  onToggle,
  onImport
}: CourseAssignmentsProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isExpanded) {
      fetchAssignments();
    }
  }, [isExpanded]);

  const fetchAssignments = async () => {
    if (!isExpanded) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/classroom/${courseId}/assignments?pageSize=5`, {
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
  };

  const handleImport = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/classroom/${courseId}/assignments/${assignmentId}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify({ period })
      });

      if (!res.ok) throw new Error('Import failed');
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      onImport?.();
    } catch (error) {
      console.error('Error importing:', error);
    }
  };

  const filteredAssignments = assignments.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="border rounded-lg">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => {
          onToggle();
          if (!isExpanded) fetchAssignments();
        }}
      >
        <h3 className="font-medium">Period {period} Assignments</h3>
        {isExpanded ? <ChevronUp /> : <ChevronDown />}
      </div>

      {isExpanded && (
        <div className="border-t p-4">
          <div className="flex gap-2 mb-4">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {loading ? (
            <div className="flex justify-center p-4">
              <LoadingSpinner />
            </div>
          ) : filteredAssignments.length === 0 ? (
            <p className="text-center text-gray-500">No assignments found</p>
          ) : (
            <div className="space-y-2">
              {filteredAssignments.map((assignment) => (
                <div 
                  key={assignment.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{assignment.title}</p>
                    <p className="text-sm text-gray-500">
                      Points: {assignment.maxPoints}
                    </p>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleImport(assignment.id)}
                  >
                    Import
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
