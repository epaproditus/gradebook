import { FC } from 'react';
import { Assignment, Student, GradeData } from '@/types/gradebook';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RosterViewProps {
  students: Record<string, Student[]>;
  assignments: Record<string, Assignment>;
  grades: GradeData;
  onGradeChange: (assignmentId: string, periodId: string, studentId: string, grade: string) => void;
  getGradeValue: (assignmentId: string, periodId: string, studentId: string) => string;
  calculateTotal: (grade: string, extra: string) => number;
  activeTab: string;
}

const RosterView: FC<RosterViewProps> = ({
  students,
  assignments,
  grades,
  onGradeChange,
  getGradeValue,
  calculateTotal,
  activeTab,
}) => {
  // Convert assignments to array and sort by date
  const sortedAssignments = Object.entries(assignments)
    .filter(([, assignment]) => assignment.periods.includes(activeTab))
    .sort(([, a], [, b]) => a.date.getTime() - b.date.getTime())
    .map(([id, assignment]) => ({ id, ...assignment }));

  // Get students for current period
  const periodStudents = students[activeTab] || [];

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-[200px] sticky left-0 bg-background">Student</TableHead>
            {sortedAssignments.map((assignment) => (
              <TableHead key={assignment.id} className="min-w-[100px] text-center">
                <div className="font-medium truncate" title={assignment.name}>
                  {assignment.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(assignment.date, 'MM/dd')}
                </div>
              </TableHead>
            ))}
            <TableHead className="text-right">Average</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {periodStudents.map((student) => {
            // Calculate student's average
            const grades = sortedAssignments.map(assignment => 
              calculateTotal(
                getGradeValue(assignment.id, activeTab, student.id.toString()),
                '0' // Extra points could be added here
              )
            );
            const average = grades.length > 0 
              ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) 
              : 0;

            return (
              <TableRow key={student.id}>
                <TableCell className="sticky left-0 bg-background font-medium">
                  {student.name}
                </TableCell>
                {sortedAssignments.map((assignment) => (
                  <TableCell key={assignment.id} className="p-0">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      className={cn(
                        "text-center h-8 text-sm border-0 focus:ring-1",
                        getGradeValue(assignment.id, activeTab, student.id.toString()) && "bg-secondary"
                      )}
                      value={getGradeValue(assignment.id, activeTab, student.id.toString())}
                      onChange={(e) => onGradeChange(assignment.id, activeTab, student.id.toString(), e.target.value)}
                    />
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium">
                  {average}%
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default RosterView;
