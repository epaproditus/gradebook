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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from 'lucide-react';

interface CourseCardProps {
  course: Course;
  onSetupClick: (course: Course) => void;
}

export function CourseCard({ course, onSetupClick }: CourseCardProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);
  const [availablePeriods, setAvailablePeriods] = useState(['1', '2', '3', '4', '5', '6', '7', '8']);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<'Math 8' | 'Algebra I'>(
    course.name.toLowerCase().includes('alg') ? 'Algebra I' : 'Math 8'
  );

  useEffect(() => {
    const loadPeriods = async () => {
      const { data: periodsData } = await supabase
        .from('students')
        .select('period')
        .not('period', 'is', null);

      if (periodsData) {
        const uniquePeriods = Array.from(new Set(periodsData.map(p => p.period))).sort();
        setAvailablePeriods(uniquePeriods);
      }
    };

    loadPeriods();
  }, []);

  useEffect(() => {
    const loadExistingMappings = async () => {
      try {
        const { data: mappings, error } = await supabase
          .from('course_mappings')
          .select('period')
          .eq('google_course_id', course.id);

        if (error) throw error;

        if (mappings) {
          const periods = mappings.map(m => m.period);
          console.log('Loaded existing mappings:', periods);
          setSelectedPeriods(periods);
        }
      } catch (error) {
        console.error('Error loading mappings:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load existing period mappings"
        });
      }
    };

    loadExistingMappings();
  }, [course.id]);

  const handlePeriodChange = async (period: string) => {
    try {
      const isSelected = selectedPeriods.includes(period);
      const newPeriods = isSelected
        ? selectedPeriods.filter(p => p !== period)
        : [...selectedPeriods, period];

      // Update local state first for immediate feedback
      setSelectedPeriods(newPeriods);

      if (!isSelected) {
        // Add new mapping
        const { error: insertError } = await supabase
          .from('course_mappings')
          .insert({
            google_course_id: course.id,
            period: period,
            subject: selectedSubject,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      } else {
        // Remove mapping
        const { error: deleteError } = await supabase
          .from('course_mappings')
          .delete()
          .match({
            google_course_id: course.id,
            period: period
          });

        if (deleteError) throw deleteError;
      }

      toast({
        title: "Success",
        description: isSelected 
          ? `Removed Period ${period}`
          : `Added Period ${period}`
      });
    } catch (error) {
      // Revert local state on error
      setSelectedPeriods(prev => isSelected 
        ? [...prev, period]
        : prev.filter(p => p !== period)
      );

      console.error('Period selection error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update period selection"
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
      const periods = selectedPeriods.filter(Boolean);
      
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
            subject: selectedSubject
          })
        }
      );

      if (importRes.status === 401) {
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-[200px] justify-between"
                  role="combobox"
                >
                  {selectedPeriods.length 
                    ? `${selectedPeriods.length} periods selected`
                    : "Select periods"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" side="bottom">
                <div className="space-y-1 p-2">
                  {availablePeriods.map(period => (
                    <div
                      key={period}
                      className="flex items-center space-x-2 rounded hover:bg-accent hover:text-accent-foreground cursor-pointer p-2 text-sm"
                      onClick={() => handlePeriodChange(period)}
                    >
                      <Checkbox 
                        checked={selectedPeriods.includes(period)}
                        className="pointer-events-none h-4 w-4"
                      />
                      <span>Period {period}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="default"
              size="sm"
              onClick={() => setShowAssignments(true)}
              disabled={loading || selectedPeriods.length === 0}
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
