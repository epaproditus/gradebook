import React, { useState, useEffect } from 'react';
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
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  // Add persistent storage key for selected period
  const storageKey = React.useMemo(() => `selected-period-${course.id}`, [course.id]);

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

  useEffect(() => {
    async function loadPeriods() {
      const { data } = await supabase
        .from('students')
        .select('period')
        .not('period', 'is', null)
        .order('period');

      // Get unique periods preserving order (1st, 1st (SPED), etc.)
      const uniquePeriods = Array.from(new Set(data?.map(p => p.period)));
      setAvailablePeriods(uniquePeriods);
      
      // Load previously selected period from localStorage
      const savedPeriod = localStorage.getItem(storageKey);
      if (savedPeriod && uniquePeriods.includes(savedPeriod)) {
        setSelectedPeriod(savedPeriod);
      }
    }

    loadPeriods();
  }, [storageKey]);

  // Save selection when it changes
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    localStorage.setItem(storageKey, value);
  };

  const handleImportAssignment = async (assignment: GoogleAssignment) => {
    if (!session?.accessToken) {
      toast({
        title: "Error",
        description: "Not authenticated",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      console.log('Importing assignment:', assignment);

      const importRes = await fetch(`/api/classroom/${course.id}/assignments/${assignment.id}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({ period: selectedPeriod }) // Add selected period
      });

      const importData = await importRes.json();
      
      if (!importRes.ok) {
        throw new Error(importData.error || 'Import failed');
      }

      toast({
        title: "Success",
        description: "Assignment imported successfully!"
      });
      setShowAssignments(false);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to import assignment',
        variant: "destructive"
      });
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
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-4">
        {/* Course Header */}
        <div className="border-b pb-3">
          <h3 className="font-medium text-lg text-gray-800">{course.name}</h3>
          {course.section && (
            <p className="text-sm text-gray-500">{course.section}</p>
          )}
        </div>

        {/* Card Actions */}
        <div className="flex items-center justify-between">
          <Select 
            value={selectedPeriod}
            onValueChange={handlePeriodChange}
          >
            <SelectTrigger className="w-28 h-8 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {availablePeriods.map(period => (
                <SelectItem key={period} value={period}>
                  {period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAssignments(true)}
            disabled={loading || !selectedPeriod}
            className="ml-2"
          >
            {loading ? <LoadingSpinner className="w-4 h-4 mr-2" /> : null}
            Import Assignment
          </Button>
        </div>
      </div>

      <AssignmentSelectDialog
        courseId={course.id}
        open={showAssignments}
        onClose={() => setShowAssignments(false)}
        onSelect={handleImportAssignment}
      />
    </div>
  );
}
