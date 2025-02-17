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
  const [showAssignments, setShowAssignments] = useState(false);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<{
    primary: string;
    secondary: string;
  }>({ primary: '', secondary: '' });

  const storageKey = React.useMemo(() => `selected-periods-${course.id}`, [course.id]);

  // Add state to track if periods are mapped
  const [mappedPeriods, setMappedPeriods] = useState<Set<string>>(new Set());

  // Add state for selected subject
  const [selectedSubject, setSelectedSubject] = useState<'Math 8' | 'Algebra I'>(
    course.name.toLowerCase().includes('alg') ? 'Algebra I' : 'Math 8'
  );

  // Modified to check existing mappings
  useEffect(() => {
    async function loadPeriodsAndMappings() {
      // Load available periods
      const { data: periodsData } = await supabase
        .from('students')
        .select('period')
        .not('period', 'is', null)
        .order('period');

      const uniquePeriods = Array.from(new Set(periodsData?.map(p => p.period)));
      setAvailablePeriods(uniquePeriods);
      
      // Get existing mappings for this course
      const { data: mappings } = await supabase
        .from('course_mappings')
        .select('period')
        .eq('google_course_id', course.id)
        .eq('setup_completed', true);

      const mapped = new Set(mappings?.map(m => m.period) || []);
      setMappedPeriods(mapped);

      // Load saved selections, but only if they're still valid
      const savedPeriods = localStorage.getItem(storageKey);
      if (savedPeriods) {
        const parsed = JSON.parse(savedPeriods);
        // Only restore selections if they were properly mapped
        setSelectedPeriods({
          primary: mapped.has(parsed.primary) ? parsed.primary : '',
          secondary: mapped.has(parsed.secondary) ? parsed.secondary : ''
        });
      }
    }

    loadPeriodsAndMappings();
  }, [storageKey, course.id]);

  // Save selection and create mapping
  const handlePeriodChange = async (value: string, type: 'primary' | 'secondary') => {
    try {
      const actualValue = value === 'none' ? '' : value;
      const newPeriods = { ...selectedPeriods, [type]: actualValue };
      
      if (actualValue) {
        // First check if mapping already exists
        const { data: existingMapping, error: checkError } = await supabase
          .from('course_mappings')
          .select('*')
          .eq('google_course_id', course.id)
          .eq('period', actualValue)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
          throw checkError;
        }

        if (!existingMapping) {
          // Create new mapping
          const { error: insertError } = await supabase
            .from('course_mappings')
            .insert({
              google_course_id: course.id,
              period: actualValue,
              setup_completed: true,
              setup_completed_at: new Date().toISOString(),
              subject: selectedSubject,
              course_name: course.name,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) throw insertError;
        }

        // Update local state
        setMappedPeriods(prev => new Set([...prev, actualValue]));
        setSelectedPeriods(newPeriods);
        localStorage.setItem(storageKey, JSON.stringify(newPeriods));

        toast({
          title: "Success",
          description: `Mapped ${course.name} to period ${actualValue}`
        });
      } else {
        // Handle removing mapping
        const { error: deleteError } = await supabase
          .from('course_mappings')
          .delete()
          .eq('google_course_id', course.id)
          .eq('period', selectedPeriods[type]);

        if (deleteError) throw deleteError;

        // Update state
        setSelectedPeriods(newPeriods);
        localStorage.setItem(storageKey, JSON.stringify(newPeriods));
        
        const newMapped = new Set(mappedPeriods);
        newMapped.delete(selectedPeriods[type]);
        setMappedPeriods(newMapped);
      }
    } catch (error) {
      console.error('Mapping error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save course mapping"
      });
    }
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
      const periods = [selectedPeriods.primary, selectedPeriods.secondary].filter(Boolean);
      
      console.log('Importing assignment with:', {
        periods,
        subject: selectedSubject,
        courseId: course.id,
        assignmentId: assignment.id
      });

      const importRes = await fetch(
        `/api/classroom/${course.id}/assignments/${assignment.id}/import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.accessToken}`
          },
          body: JSON.stringify({ 
            periods,
            subject: selectedSubject // Make sure we send the subject
          })
        }
      );

      if (importRes.status === 401) {
        // Refresh the page to trigger re-auth
        window.location.reload();
        return;
      }

      const result = await importRes.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      toast({
        title: "Success",
        description: `Assignment imported for ${periods.length} period(s)`
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

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-4">
        {/* Course Header */}
        <div className="border-b pb-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-lg text-gray-800">{course.name}</h3>
              {course.section && (
                <p className="text-sm text-gray-500">{course.section}</p>
              )}
            </div>
            <Select
              value={selectedSubject}
              onValueChange={(value: 'Math 8' | 'Algebra I') => setSelectedSubject(value)}
            >
              <SelectTrigger className="w-24 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Math 8">Math 8</SelectItem>
                <SelectItem value="Algebra I">Algebra I</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Card Actions - Updated Layout */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Select 
                value={selectedPeriods.primary || 'none'}
                onValueChange={(value) => handlePeriodChange(value, 'primary')}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Period 1" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Clear</SelectItem>
                  {availablePeriods.map(period => (
                    <SelectItem 
                      key={period} 
                      value={period}
                      disabled={period === selectedPeriods.secondary}
                    >
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={selectedPeriods.secondary || 'none'}
                onValueChange={(value) => handlePeriodChange(value, 'secondary')}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Period 2" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Clear</SelectItem>
                  {availablePeriods.map(period => (
                    <SelectItem 
                      key={period} 
                      value={period}
                      disabled={period === selectedPeriods.primary}
                    >
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => setShowAssignments(true)}
              disabled={loading || (!selectedPeriods.primary && !selectedPeriods.secondary)}
            >
              {loading ? <LoadingSpinner className="w-4 h-4 mr-2" /> : null}
              Import Assignment
            </Button>
          </div>
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
