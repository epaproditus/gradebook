'use client';

import { FC, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Assignment, Student, GradeData } from '@/types/gradebook';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ImportScoresDialogProps {
  assignmentId: string;
  periodId: string;
  onImport: (grades: Record<string, string>) => void;
  unsavedGrades: GradeData;
  setUnsavedGrades: React.Dispatch<React.SetStateAction<GradeData>>;
  setEditingGrades: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  assignments: Record<string, Assignment>;
  students: Record<string, Student[]>;
  grades: GradeData;
}

export const ImportScoresDialog: FC<ImportScoresDialogProps> = ({
  assignmentId,
  periodId,
  onImport,
  unsavedGrades,
  setUnsavedGrades,
  setEditingGrades,
  assignments,
  students,
  grades,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<string>(assignmentId);
  const [open, setOpen] = useState(false);
  const dialogTriggerRef = useRef<HTMLButtonElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };

  const handleSubmitImport = async () => {
    if (!file || !selectedAssignment) {
      alert('Please select both a file and an assignment');
      return;
    }

    try {
      const text = await file.text();
      const rows = text.split('\n');
      const headers = rows[0].split(',').map(h => h.trim());
      
      let studentIdIndex = headers.findIndex(h => h === 'LocalID' || h === 'Student ID');
      let scoreIndex = headers.findIndex(h => h === 'Score' || h === 'Final Grade');

      if (studentIdIndex === -1 || scoreIndex === -1) {
        const firstDataRow = rows[1]?.split(',').map(col => col.trim());
        
        if (firstDataRow) {
          studentIdIndex = firstDataRow.findIndex(col => /^\d{6}$/.test(col));
          scoreIndex = firstDataRow.findIndex(col => /^\d{2,3}$/.test(col));

          if (studentIdIndex === -1) {
            studentIdIndex = headers.findIndex((_, index) => 
              rows.slice(1).some(row => /^\d{6}$/.test(row.split(',')[index]?.trim()))
            );
          }
          
          if (scoreIndex === -1) {
            scoreIndex = headers.findIndex((_, index) => 
              rows.slice(1).some(row => /^\d{2,3}$/.test(row.split(',')[index]?.trim()))
            );
          }
        }
      }

      if (studentIdIndex === -1 || scoreIndex === -1) {
        alert('Could not find student ID and grade columns in the file.');
        return;
      }

      const importedGrades: Record<string, string> = {};
      
      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',').map(col => col.trim());
        if (columns.length <= Math.max(studentIdIndex, scoreIndex)) continue;
        
        const studentId = columns[studentIdIndex];
        const score = columns[scoreIndex];

        if (/^\d{6}$/.test(studentId) && /^\d{2,3}$/.test(score)) {
          importedGrades[studentId] = score;
        }
      }

      onImport(importedGrades);
      setFile(null);
      setOpen(false);
    } catch (error) {
      console.error('Error importing grades:', error);
      alert('Error importing grades. Please check the file format.');
    }
  };

  // This function handles the card click prevention
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost"
            size="icon"
            onClick={handleButtonClick}
            ref={dialogTriggerRef}
          >
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Import Scores</p>
        </TooltipContent>
      </Tooltip>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Scores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">Select Assignment</h4>
              <Select defaultValue={assignmentId} onValueChange={setSelectedAssignment}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose assignment..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(assignments)
                    .filter(([_, a]) => a.periods.includes(periodId))
                    .map(([id, assignment]) => (
                      <SelectItem key={id} value={id}>
                        {assignment.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
            />
            <div className="text-sm text-muted-foreground">
              Upload a CSV file exported from DMAC containing student scores.
            </div>
            {file && (
              <Button 
                onClick={handleSubmitImport}
                className="w-full"
              >
                Import Scores
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
