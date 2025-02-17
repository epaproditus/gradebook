'use client';

import { FC, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Download } from 'lucide-react';
import { Assignment, Student } from '@/types/gradebook';

interface ExportDialogProps {
  assignments: Record<string, Assignment>;
  students: Record<string, Student[]>;
  onExport: (assignments: string[], periods: string[], merge: boolean) => void;
}

export const GradeExportDialog: FC<ExportDialogProps> = ({ assignments, students, onExport }) => {
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [mergePeriods, setMergePeriods] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="text-sm h-8 flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export Grades
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Grades</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-medium">Assignments</h4>
            <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
              <SelectTrigger>
                <SelectValue placeholder="Select Assignment" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(assignments).map(([id, assignment]) => (
                  <SelectItem key={id} value={id}>
                    {assignment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">Class Periods</h4>
            <div className="space-y-2">
              {Object.keys(students).map((periodId) => (
                <div key={periodId} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedPeriods.includes(periodId)}
                    onCheckedChange={(checked) => {
                      setSelectedPeriods(prev => 
                        checked 
                          ? [...prev, periodId]
                          : prev.filter(p => p !== periodId)
                      );
                    }}
                  />
                  <span className="text-sm">Period {periodId}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={mergePeriods}
              onCheckedChange={(checked) => setMergePeriods(!!checked)}
            />
            <span className="text-sm">Merge all periods into one file</span>
          </div>
        </div>
        <Button 
          onClick={() => onExport([selectedAssignment], selectedPeriods, mergePeriods)}
          disabled={selectedAssignment === '' || selectedPeriods.length === 0}
        >
          Export Selected
        </Button>
      </DialogContent>
    </Dialog>
  );
};
