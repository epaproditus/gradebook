import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseConfig';

interface StudentMappingProps {
  courseId: string;
  periodId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentMappingDialog({ courseId, periodId, open, onOpenChange }: StudentMappingProps) {
  const [mappings, setMappings] = useState<any[]>([]);
  const [googleStudents, setGoogleStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchCurrentMappings();
    }
  }, [open]);

  const fetchCurrentMappings = async () => {
    setLoading(true);
    try {
      // First fetch local students
      const { data: localStudents, error: localError } = await supabase
        .from('students')
        .select('id, name')
        .eq('course_id', courseId)
        .eq('period', periodId); // Changed from period_id to period to match schema

      if (localError) throw new Error(localError.message);

      // Then fetch Google students
      const response = await fetch(`/api/classroom/${courseId}/students`);
      const { students: googleStudents } = await response.json();

      // Get existing mappings
      const { data: existingMappings, error: mappingError } = await supabase
        .from('student_mappings')
        .select('*')
        .eq('course_id', courseId)
        .eq('period', periodId); // Changed from period_id to period

      if (mappingError) throw new Error(mappingError.message);

      // Create mapping objects
      const mappings = localStudents?.map(student => ({
        localStudent: student,
        googleId: existingMappings?.find(m => m.student_id === student.id)?.google_id || null
      })) || [];

      setMappings(mappings);
      setGoogleStudents(googleStudents || []);

    } catch (error) {
      console.error('Mapping fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch student mappings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMapping = async (localStudentId: number, googleId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('student_mappings')
        .upsert({
          student_id: localStudentId,
          google_id: googleId,
          course_id: courseId,
          period: periodId, // Changed from period_id to period
          last_synced: new Date().toISOString()
        }, {
          onConflict: 'student_id,course_id'
        });

      if (updateError) throw updateError;
      
      toast({
        title: "Success",
        description: "Student mapping updated"
      });
      
      fetchCurrentMappings();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: "Failed to update mapping",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Student Mappings</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-4">
              {mappings.map((mapping) => (
                <div key={mapping.localStudent.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{mapping.localStudent.name}</p>
                    <p className="text-sm text-gray-500">Local ID: {mapping.localStudent.id}</p>
                  </div>
                  <Select
                    value={mapping.googleId || ''}
                    onValueChange={(value) => handleUpdateMapping(mapping.localStudent.id, value)}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select Google student..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not mapped</SelectItem>
                      {googleStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name.fullName} ({student.emailAddress})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
