import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from 'next-auth/react';
import { PlusCircle } from 'lucide-react';
import LoadingSpinner from './ui/loading-spinner';

interface GoogleCourse {
  id: string;
  name: string;
  period?: string;
}

interface GoogleAssignment {
  id: string;
  title: string;
  maxPoints?: number;
}

export function ImportAssignmentButton() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<GoogleCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<GoogleCourse | null>(null);
  const [assignments, setAssignments] = useState<GoogleAssignment[]>([]);

  const loadCourses = async () => {
    if (!session?.accessToken) return;
    
    try {
      const res = await fetch('/api/classroom/courses', {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadAssignments = async (courseId: string) => {
    if (!session?.accessToken) return;
    setLoading(true);
    
    try {
      const res = await fetch(`/api/classroom/${courseId}/assignments?pageSize=5`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      const data = await res.json();
      setAssignments(data.courseWork || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (courseId: string, assignmentId: string) => {
    if (!session?.accessToken || !selectedCourse?.period) return;
    
    try {
      const res = await fetch(`/api/classroom/${courseId}/assignments/${assignmentId}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({ period: selectedCourse.period })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Import failed');
      }

      // Remove imported assignment from list
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          onClick={loadCourses}
          className="gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Import Assignment
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Import Google Classroom Assignment</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-4">
            {courses.map(course => (
              <div 
                key={course.id} 
                className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  setSelectedCourse(course);
                  loadAssignments(course.id);
                }}
              >
                <h3 className="font-medium">{course.name}</h3>
              </div>
            ))}
          </div>

          {selectedCourse && (
            <div className="space-y-4">
              <h4 className="font-medium">Recent Assignments</h4>
              {loading ? (
                <div className="flex justify-center p-4">
                  <LoadingSpinner />
                </div>
              ) : assignments.length === 0 ? (
                <p className="text-center text-gray-500">No assignments found</p>
              ) : (
                assignments.map(assignment => (
                  <div 
                    key={assignment.id}
                    className="p-4 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{assignment.title}</div>
                      <div className="text-sm text-gray-500">
                        Points: {assignment.maxPoints || 100}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleImport(selectedCourse.id, assignment.id)}
                    >
                      Import
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
