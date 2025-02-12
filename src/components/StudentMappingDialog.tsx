import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { supabase } from '@/lib/supabaseConfig';

interface StudentMapping {
  googleId: string;
  googleName: string;
  googleEmail: string;
  gradebookStudentId?: string;
}

export function StudentMappingDialog({ 
  open, 
  courseId, 
  onClose, 
  onSave 
}: { 
  open: boolean; 
  courseId: string; 
  onClose: () => void;
  onSave: (mappings: StudentMapping[]) => void;
}) {
  const [mappings, setMappings] = useState<StudentMapping[]>([]);
  const [gradebookStudents, setGradebookStudents] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // Load gradebook students
      const { data: students } = await supabase
        .from('students')
        .select('*')
        .order('name');
      
      setGradebookStudents(students || []);
    };

    if (open) {
      loadData();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Map Students</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>Google Classroom Student</th>
                <th>Gradebook Student</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((mapping) => (
                <tr key={mapping.googleId}>
                  <td>
                    {mapping.googleName}
                    <br />
                    <span className="text-sm text-gray-500">{mapping.googleEmail}</span>
                  </td>
                  <td>
                    <Select
                      value={mapping.gradebookStudentId || ''}
                      onValueChange={(value) => {
                        setMappings(mappings.map(m => 
                          m.googleId === mapping.googleId 
                            ? { ...m, gradebookStudentId: value }
                            : m
                        ));
                      }}
                    >
                      <option value="">Select student...</option>
                      {gradebookStudents.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(mappings)}>Save Mappings</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
