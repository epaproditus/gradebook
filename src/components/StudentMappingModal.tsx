import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";

interface StudentMapping {
  googleId: string;
  email: string;
  name: string;
  matched: boolean;
  gradebookId?: string;
}

export function StudentMappingModal({
  open,
  onClose,
  students,
  onConfirm
}: {
  open: boolean;
  onClose: () => void;
  students: StudentMapping[];
  onConfirm: (mappings: StudentMapping[]) => void;
}) {
  const [mappings, setMappings] = useState(students);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Map Students</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Google Classroom Student</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((student) => (
                <TableRow 
                  key={student.googleId}
                  className={student.matched ? 'bg-green-50' : 'bg-yellow-50'}
                >
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>
                    {student.matched ? 
                      '✅ Matched' : 
                      '⚠️ Not matched'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => onConfirm(mappings)}
            disabled={mappings.some(m => !m.matched)}
          >
            Confirm & Import
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
