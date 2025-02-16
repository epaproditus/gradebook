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
    const actualValue = value === 'none' ? '' : value;
    const newPeriods = { ...selectedPeriods, [type]: actualValue };
    
    if (actualValue) {
      try {
        // Create new mapping
        const { error } = await supabase
          .from('course_mappings')
          .upsert({
            google_course_id: course.id,
            period: actualValue,
            setup_completed: true,
            setup_completed_at: new Date().toISOString(),
            subject: course.name.toLowerCase().includes('algebra') ? 'Algebra I' : 'Math 8'
          });

        if (error) {
          toast({
            title: "Error",
            description: `Could not map ${course.name} to period ${actualValue}`,
            variant: "destructive"
          });
          return; // Don't update state if mapping failed
        }

        // Update mapped periods
        setMappedPeriods(prev => new Set([...prev, actualValue]));
        
        // Save to localStorage
        setSelectedPeriods(newPeriods);
        localStorage.setItem(storageKey, JSON.stringify(newPeriods));

        toast({
          title: "Success",
          description: `Mapped ${course.name} to period ${actualValue}`
        });
      } catch (error) {
        console.error('Failed to create mapping:', error);
        toast({
          title: "Error",
          description: "Failed to save mapping",
          variant: "destructive"
        });
      }
    } else {
      // Handle clearing selection
      try {
        // Remove mapping if it exists
        const { error } = await supabase
          .from('course_mappings')
          .delete()
          .eq('google_course_id', course.id)
          .eq('period', selectedPeriods[type]);

        if (error) throw error;

        // Update state and localStorage
        setSelectedPeriods(newPeriods);
        localStorage.setItem(storageKey, JSON.stringify(newPeriods));
        
        // Remove from mapped periods
        const newMapped = new Set(mappedPeriods);
        newMapped.delete(selectedPeriods[type]);
        setMappedPeriods(newMapped);

        toast({
          title: "Success",
          description: `Removed ${course.name} mapping from period ${selectedPeriods[type]}`
        });
      } catch (error) {
        console.error('Failed to remove mapping:', error);
        toast({
          title: "Error",
          description: "Failed to remove mapping",
          variant: "destructive"
        });
      }
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
      
      console.log('Attempting import with token:', session.accessToken.slice(0, 10) + '...');

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
            subject: selectedSubject,
            accessToken: session.accessToken // Add token to body as well
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

      // More explicit toast call
      toast({
        title: "Assignment Imported!",
        description: `Successfully imported ${assignment.title} for ${result.periodsFound.length} period(s)`,
        variant: "default",
        className: "bg-green-50 border-green-500",
        duration: 5000,
        style: {
          border: '1px solid #22c55e',
          color: '#15803d',
        },
      });

      setShowAssignments(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to import assignment',
        variant: "destructive",
        duration: 5000,
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

        {/* Card Actions */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="space-x-2 text-sm text-gray-600">
              <Select 
                value={selectedPeriods.primary || 'none'}
                onValueChange={(value) => handlePeriodChange(value, 'primary')}
              >
                <SelectTrigger className="w-24 h-7 text-xs">
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
                <SelectTrigger className="w-24 h-7 text-xs">
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
          </div>

          <Button
            variant="default" // Changed from outline to make it more prominent
            size="default" // Changed from sm to default
            onClick={() => setShowAssignments(true)}
            disabled={loading || (!selectedPeriods.primary && !selectedPeriods.secondary)}
            className="w-full" // Make button full width
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
