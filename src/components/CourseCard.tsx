import { useState, useEffect } from 'react';
import { CourseSetupDialog } from './CourseSetupDialog';
import { Button } from './ui/button';
import { useSession } from 'next-auth/react';
import LoadingSpinner from './ui/loading-spinner';
import { supabase } from '@/lib/supabaseConfig';
import type { Course } from '@/types/classroom';
import { AssignmentSelectDialog } from './AssignmentSelectDialog';
import type { GoogleAssignment } from './AssignmentSelectDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

interface CourseCardProps {
  course: Course;
  onSetupClick: (course: Course) => void;
}

export function CourseCard({ course, onSetupClick }: CourseCardProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupStatus, setSetupStatus] = useState<{ completed: boolean, periods: string[] }>({
    completed: false,
    periods: []
  });
  const [showAssignments, setShowAssignments] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<'Math 8' | 'Algebra I'>('Math 8');

  // Detect if course is likely Algebra based on name
  useEffect(() => {
    const isAlgebraCourse = course.name.toLowerCase().includes('alg') || 
                           course.name.toLowerCase().includes('algebra');
    if (isAlgebraCourse) {
      setSelectedSubject('Algebra I');
    }
  }, [course.name]);

  useEffect(() => {
    async function checkSetupStatus() {
      const { data } = await supabase
        .from('course_mappings')
        .select('period')
        .eq('google_course_id', course.id)
        .eq('setup_completed', true);

      setSetupStatus({
        completed: (data?.length || 0) > 0,
        periods: data?.map(d => d.period) || []
      });
    }

    checkSetupStatus();
  }, [course.id]);

  const handleImportAssignment = async (assignment: GoogleAssignment) => {
    if (!session?.accessToken || !setupStatus.completed) {
      alert('Course not set up. Please complete course setup first.');
      return;
    }
    
    setLoading(true);
    try {
      const importRes = await fetch(`/api/classroom/${course.id}/assignments/${assignment.id}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({ 
          period: setupStatus.periods[0],
          forceUpdate: assignment.forceUpdate === true
        })
      });

      const importData = await importRes.json();
      
      if (!importRes.ok) {
        if (importData.error === "Assignment already exists") {
          setShowAssignments(false);
           // Instead of calling handleAssignmentClick, show the AssignmentSelectDialog again
          return;
        }
        throw new Error(importData.error || 'Import failed');
      }

      alert('Assignment imported successfully!');
      setShowAssignments(false);
    } catch (error) {
      console.error('Import error:', error);
      alert(error instanceof Error ? error.message : 'Failed to import assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleImportRecent = async () => {
    if (!session?.accessToken || !setupStatus.completed) {
      alert('Course setup not completed. Please set up the course first.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/classroom/${course.id}/assignments?pageSize=1`, {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      
      const data = await res.json();
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch assignments');
      }
      
      if (!data.courseWork?.[0]) {
        alert('No recent assignments found');
        return;
      }

      await handleImportAssignment(data.courseWork[0]);
    } catch (error) {
      console.error('Import error:', error);
      alert(error instanceof Error ? error.message : 'Failed to import assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSubmit = async () => {
    setIsSettingUp(true);
    try {
      const response = await fetch('/api/classroom/setup-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: course.id,
          period: selectedPeriod,
          subject: selectedSubject, // Include subject in setup
          name: course.name
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to setup course');
      }

      const updatedCourse = await response.json();
      onSetupClick(updatedCourse);
      
    } catch (error) {
      console.error('Setup error:', error);
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: error instanceof Error ? error.message : "Failed to setup course"
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSetupClose = () => {
    setShowSetup(false);
    onSetupClick(course);
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{course.name}</h3>
          {course.section && (
            <p className="text-sm text-gray-500">{course.section}</p>
          )}
          {setupStatus.completed ? (
            <span className="text-sm text-green-600">
              ✓ Setup complete for periods: {setupStatus.periods.join(', ')}
            </span>
          ) : (
            <span className="text-sm text-orange-600">Needs Setup</span>
          )}
        </div>
        <div className="flex gap-2">
          {setupStatus.completed && (
            <Button
              variant="outline"
              onClick={() => setShowAssignments(true)}
              disabled={loading}
            >
              {loading ? <LoadingSpinner className="w-4 h-4 mr-2" /> : null}
              Import Assignment
            </Button>
          )}
          <Button 
            variant={setupStatus.completed ? "outline" : "default"}
            onClick={() => setShowSetup(true)}
          >
            {setupStatus.completed ? 'Edit Setup' : 'Setup Course'}
          </Button>
        </div>
      </div>

      {showSetup && (
        <CourseSetupDialog
          courseId={course.id}
          courseName={course.name}
          open={showSetup}
          onClose={handleSetupClose}
        />
      )}

      <AssignmentSelectDialog
        courseId={course.id}
        open={showAssignments}
        onClose={() => setShowAssignments(false)}
        onSelect={handleImportAssignment}
      />

      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-4">
          <Select
            value={selectedPeriod}
            onValueChange={setSelectedPeriod}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {['1', '2', '3', '4', '5', '6', '7', '8'].map(period => (
                <SelectItem key={period} value={period}>
                  Period {period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedSubject}
            onValueChange={(value: 'Math 8' | 'Algebra I') => setSelectedSubject(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Math 8">Math 8</SelectItem>
              <SelectItem value="Algebra I">Algebra I</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedPeriod && (
          <Button 
            onClick={handleSetupSubmit}
            disabled={isSettingUp}
            className="w-full"
          >
            {isSettingUp ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Setting up...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
