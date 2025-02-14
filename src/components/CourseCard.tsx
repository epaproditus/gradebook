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
import { TestMappingDialog } from './TestMappingDialog';

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
  const [existingMappings, setExistingMappings] = useState<any[]>([]);
  const [showTestMapping, setShowTestMapping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        .select('period') // using 'period' instead of 'period_id'
        .eq('google_course_id', course.id) // using correct column name
        .eq('setup_completed', true);

      setSetupStatus({
        completed: (data?.length || 0) > 0,
        periods: data?.map(d => d.period) || []
      });
    }

    checkSetupStatus();
  }, [course.id]);

  useEffect(() => {
    async function fetchMappings() {
      const { data } = await supabase
        .from('student_mappings')
        .select(`
          *,
          students (name)
        `)
        .eq('period', setupStatus.periods[0]);

      setExistingMappings(data || []);
    }

    if (setupStatus.completed && setupStatus.periods.length > 0) {
      fetchMappings();
    }
  }, [setupStatus]);

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

  const handleSetupClose = () => {
    setShowSetup(false);
    onSetupClick(course);
  };

  const verifyMappings = async () => {
    try {
      const res = await fetch(`/api/debug/mappings?period=${setupStatus.periods[0]}`);
      const data = await res.json();
      console.log('Mapping verification:', data);
      
      toast({
        title: "Mapping Status",
        description: `Found ${data.count} mappings for period ${data.period}`
      });
    } catch (error) {
      console.error('Verification failed:', error);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch(
        `/api/debug/course-status?courseId=${course.id}&period=${setupStatus.periods[0]}`
      );
      const data = await res.json();
      console.log('Course status:', data);
      
      toast({
        title: "Status Check",
        description: `Found ${data.diagnostics.mappingCount} mappings for ${data.diagnostics.studentCount} students`
      });
    } catch (error) {
      console.error('Status check failed:', error);
    }
  };

  const handleSetupClick = async () => {
    setIsLoading(true);
    try {
      setShowSetup(true);
    } catch (error) {
      console.error('Setup error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to open setup dialog"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearSetup = async (period: string) => {
    if (!period || !course.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing period or course ID"
      });
      return;
    }

    try {
      // Sanitize period string
      const sanitizedPeriod = encodeURIComponent(period.trim());
      
      const response = await fetch(
        `/api/debug/clear-setup?courseId=${course.id}&period=${sanitizedPeriod}`,
        { 
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear setup');
      }

      toast({
        title: "Setup Cleared",
        description: `Successfully cleared setup for period ${period}`
      });

      // Refresh setup status
      const { data: mappings } = await supabase
        .from('course_mappings')
        .select('period')
        .eq('google_course_id', course.id);
        
      setSetupStatus({
        completed: (mappings?.length || 0) > 0,
        periods: mappings?.map(d => d.period) || []
      });

    } catch (error) {
      console.error('Clear setup error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clear setup"
      });
    }
  };

  const checkPeriodMappings = async (period: string) => {
    try {
      const res = await fetch(`/api/debug/check-mappings?period=${period}`);
      const data = await res.json();
      
      console.log('Period mapping check:', data);
      
      toast({
        title: "Mapping Check",
        description: `Found ${data.diagnostics.studentMappings.count} student mappings and ${data.diagnostics.courseMappings.count} course mappings`
      });

      // If we find inconsistencies, offer to fix them
      if (data.diagnostics.courseMappings.count === 0 && data.diagnostics.studentMappings.count > 0) {
        if (confirm('Found orphaned student mappings. Clear them?')) {
          await clearSetup(period);
        }
      }
    } catch (error) {
      console.error('Check failed:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check mappings"
      });
    }
  };

  const syncGoogleIds = async (period: string) => {
    try {
      const response = await fetch(
        `/api/debug/sync-google-ids?period=${encodeURIComponent(period)}`,
        { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync Google IDs');
      }

      toast({
        title: "Sync Complete",
        description: `Updated ${data.updated} students with Google IDs for period ${period}`
      });

    } catch (error) {
      console.error('Sync error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync Google IDs"
      });
    }
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
            onClick={handleSetupClick}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner className="w-4 h-4 mr-2" />
            ) : null}
            {setupStatus.completed ? 'Edit Setup' : 'Setup Course'}
          </Button>
        </div>
      </div>

      {setupStatus.completed && existingMappings.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          <p>Mapped Students: {existingMappings.length}</p>
          <button 
            onClick={() => setShowSetup(true)}
            className="text-blue-500 hover:underline"
          >
            View Mappings
          </button>
        </div>
      )}

      {setupStatus.completed && (
        <div className="mt-2 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={verifyMappings}
          >
            Verify Mappings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
          >
            Check Status
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTestMapping(true)}
            className="mt-2 text-xs"
          >
            Test Mappings View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkPeriodMappings(setupStatus.periods[0])}
          >
            Debug Mappings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncGoogleIds(setupStatus.periods[0])}
          >
            Sync Google IDs
          </Button>
          <div className="flex flex-wrap gap-2 mt-2">
            {Array.from(new Set(setupStatus.periods)).map(period => (
              <Button
                key={period}
                variant="destructive"
                size="sm"
                onClick={() => clearSetup(period)}
              >
                Clear {period} Setup
              </Button>
            ))}
          </div>
        </div>
      )}

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

      {showTestMapping && (
        <TestMappingDialog
          courseId={course.id}
          courseName={course.name}
          period={setupStatus.periods[0]}
          open={showTestMapping}
          onClose={() => setShowTestMapping(false)}
        />
      )}
    </div>
  );
}
