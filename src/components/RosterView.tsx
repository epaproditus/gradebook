import { FC, useState } from 'react';
import { Assignment, Student, GradeData } from '@/types/gradebook';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  // Update average calculation to handle missing assessment types
  const calculateWeightedAverage = (grades: number[], types: ('Daily' | 'Assessment')[]) => {
    if (grades.length === 0) return 0;
    
    const dailyGrades = grades.filter((_, i) => types[i] === 'Daily');
    const assessmentGrades = grades.filter((_, i) => types[i] === 'Assessment');
    
    // If no assessments, use 100% daily grades
    if (assessmentGrades.length === 0) {
      return dailyGrades.length > 0 
        ? Math.round(dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length)
        : 0;
    }
    
    const dailyAvg = dailyGrades.length > 0 
      ? dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length 
      : 0;
    
    const assessmentAvg = assessmentGrades.reduce((a, b) => a + b, 0) / assessmentGrades.length;
    
    return Math.round((dailyAvg * 0.8) + (assessmentAvg * 0.2));
  };

  // Convert assignments to array and sort by date
  const sortedAssignments = Object.entries(assignments)
    .filter(([, assignment]) => assignment.periods.includes(activeTab))
    .sort(([, a], [, b]) => b.date.getTime() - a.date.getTime()) // Reverse sort: newest first
    .map(([id, assignment]) => ({ id, ...assignment }));

  // Get students for current period
  const periodStudents = students[activeTab] || [];

  const toggleColumn = (assignmentId: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(assignmentId)) {
        next.delete(assignmentId);
      } else {
        next.add(assignmentId);
      }
      return next;
    });
  };

  // Update assignment card date format
  const formatAssignmentDate = (date: Date, isCollapsed: boolean) => {
    if (isCollapsed) {
      return format(date, 'MMMM dd');
    }
    return format(date, 'MM/dd');
  };

  // Update average calculation
  const calculateStudentAverage = (student: Student) => {
    const grades = sortedAssignments.map(assignment => ({
      grade: calculateTotal(
        getGradeValue(assignment.id, activeTab, student.id.toString()),
        '0'
      ),
      type: assignment.type,
      hasGrade: getGradeValue(assignment.id, activeTab, student.id.toString()) !== ''
    }));

    // Filter out assignments without grades
    const validGrades = grades.filter(g => g.hasGrade);
    if (validGrades.length === 0) return 0;

    return calculateWeightedAverage(
      validGrades.map(g => g.grade),
      validGrades.map(g => g.type)
    );
  };

  // Add save function for the roster view
  const handleSaveAll = async () => {
    try {
      const promises = sortedAssignments.map(assignment => 
        saveGrades(assignment.id, activeTab)
      );
      
      await Promise.all(promises);
      toast({
        title: "Success",
        description: "All grades saved successfully"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save some grades"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleSaveAll} className="mb-4">
          Save All Grades
        </Button>
      </div>
      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="h-[160px]"> {/* Reduced height */}
              <TableHead className="sticky left-0 top-0 bg-background z-50 w-[200px] min-w-[200px]">
                Student
              </TableHead>
              {sortedAssignments.map((assignment, index) => (
                <TableHead 
                  key={assignment.id} 
                  onClick={() => toggleColumn(assignment.id)}
                  className={cn(
                    "relative transition-all duration-200 cursor-pointer group",
                    "hover:bg-accent",
                    collapsedColumns.has(assignment.id) ? "w-12 min-w-[3rem]" : "w-32 min-w-[8rem]",
                    `z-${40 - index}`
                  )}
                  style={{ zIndex: 40 - index }}
                >
                  <div 
                    className={cn(
                      "absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-2 px-1",
                      "transition-all duration-200",
                      collapsedColumns.has(assignment.id) ? "opacity-0" : "opacity-100"
                    )}
                  >
                    <div className="line-clamp-2 text-center text-sm font-medium mb-1 w-full">
                      {assignment.name}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(assignment.date, 'MM/dd')}
                    </div>
                    <ChevronUp className="h-3 w-3 mt-1 text-muted-foreground" />
                  </div>
                  
                  {/* Collapsed state */}
                  <div 
                    className={cn(
                      "absolute inset-0 flex items-center justify-center",
                      "transition-all duration-200",
                      !collapsedColumns.has(assignment.id) ? "opacity-0" : "opacity-100"
                    )}
                  >
                    <div className="flex flex-col items-center rotate-90">
                      <ChevronDown className="h-3 w-3 mb-1" />
                      <span className="text-xs whitespace-nowrap">
                        {formatAssignmentDate(assignment.date, true)}
                      </span>
                    </div>
                  </div>
                </TableHead>
              ))}
              <TableHead className="sticky right-0 top-0 bg-background z-50 w-[100px] min-w-[100px]">
                Average
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periodStudents.map((student) => {
              // Calculate student's average from all assignments
              const average = calculateStudentAverage(student);

              return (
                <TableRow key={student.id}>
                  <TableCell className="sticky left-0 bg-background z-40 font-medium">
                    {student.name}
                  </TableCell>
                  {sortedAssignments.map((assignment) => (
                    <TableCell 
                      key={assignment.id} 
                      className={cn(
                        "p-0 transition-all duration-200",
                        collapsedColumns.has(assignment.id) ? "w-12" : "w-32"
                      )}
                    >
                      {!collapsedColumns.has(assignment.id) ? (
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          className={cn(
                            "text-center h-8 text-sm border-0 focus:ring-1",
                            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                            getGradeValue(assignment.id, activeTab, student.id.toString()) && "bg-secondary"
                          )}
                          value={getGradeValue(assignment.id, activeTab, student.id.toString())}
                          onChange={(e) => onGradeChange(assignment.id, activeTab, student.id.toString(), e.target.value)}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-8 text-sm font-medium">
                          {getGradeValue(assignment.id, activeTab, student.id.toString()) || '-'}
                        </div>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="sticky right-0 bg-background z-40 font-medium text-right">
                    {average}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RosterView;
