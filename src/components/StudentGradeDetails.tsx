import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Assignment } from "@/types/gradebook";
import { calculateTotal } from "@/lib/gradeCalculations";

interface StudentGradeDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  period: string;  // Add period prop
  studentId: string;  // Add studentId prop
  assignments: Assignment[];
  grades: Record<string, string>;
  extraPoints: Record<string, string>;
  subject: string;  // Add subject prop
}

export function StudentGradeDetails({
  isOpen,
  onClose,
  studentName,
  period,
  studentId,
  assignments,
  grades,
  extraPoints,
  subject
}: StudentGradeDetailsProps) {
  // Filter assignments by period and subject
  const filteredAssignments = assignments.filter(assignment => 
    assignment.periods.includes(period) && 
    assignment.subject === subject
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{studentName} - Period {period} ({subject})</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Assignment</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Grade</TableHead>
              <TableHead className="text-right">Extra</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssignments.map(assignment => {
              const grade = grades[assignment.id] || '-';
              const extra = extraPoints[assignment.id] || '0';
              const total = grade !== '-' ? calculateTotal(grade, extra) : '-';

              return (
                <TableRow key={assignment.id}>
                  <TableCell>{format(assignment.date, 'MM/dd/yy')}</TableCell>
                  <TableCell>{assignment.name}</TableCell>
                  <TableCell>{assignment.type}</TableCell>
                  <TableCell className="text-right">{grade}</TableCell>
                  <TableCell className="text-right">{extra !== '0' ? `+${extra}` : '-'}</TableCell>
                  <TableCell className="text-right font-medium">{total}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
