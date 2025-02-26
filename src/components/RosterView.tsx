import { FC, useState, useEffect, useMemo } from 'react';
import { Assignment, Student, GradeData } from '@/types/gradebook';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImportScoresDialog } from './ImportScoresDialog';
import { GradeExportDialog } from './GradeExportDialog';
import { STATUS_COLORS, TYPE_COLORS } from '@/lib/constants';
import { toast } from "@/components/ui/use-toast";
import { ColorSettings } from './ColorSettings'; // New import
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // New import
import { calculateWeightedAverage, calculateTotal } from '@/lib/gradeCalculations';
import { formatGradeDisplay, getGradeDisplayClass } from '@/lib/displayFormatters';
import { MessagePanel } from './MessagePanel';
import { MessageIndicator } from './MessageIndicator';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getCurrentSixWeeks } from '@/lib/dateUtils'; // Add this import

interface RosterViewProps {
  students: Record<string, Student[]>;
  assignments: Record<string, Assignment>;
  grades: GradeData;
  onGradeChange: (assignmentId: string, periodId: string, studentId: string, grade: string) => void;
  getGradeValue: (assignmentId: string, periodId: string, studentId: string) => string;
  calculateTotal: (grade: string, extra: string) => number;
  activeTab: string;
  unsavedGrades: GradeData;
  setUnsavedGrades: React.Dispatch<React.SetStateAction<GradeData>>;
  setEditingGrades: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleImportGrades: (assignmentId: string, periodId: string, grades: Record<string, string>) => void;
  exportGrades: (assignmentIds: string[], periodIds: string[], merge: boolean) => void;
  saveGrades: (assignmentId: string, periodId: string) => Promise<void>; // Add this
  extraPoints: Record<string, string>;  // Make sure this prop is passed
  editingGrades: Record<string, boolean>;  // Add this prop
  onExtraPointsChange: (assignmentId: string, periodId: string, studentId: string, points: string) => void;
  messages: Message[];
  onMessageResolve: (messageId: string) => Promise<void>;
  onMessageCreate: (studentId: number, assignmentId: string, message: string, type: 'grade_question' | 'general') => Promise<void>;
  defaultSixWeeks?: string;
}

const RosterView: FC<RosterViewProps> = ({
  students,
  assignments,
  grades,
  onGradeChange,
  getGradeValue,
  calculateTotal,
  activeTab,
  unsavedGrades,
  setUnsavedGrades,
  setEditingGrades,
  handleImportGrades,
  exportGrades,
  saveGrades, // Add this
  extraPoints,  // Add this to the destructuring
  editingGrades,  // Add this to destructuring
  onExtraPointsChange,  // Add this to destructuring
  messages,
  onMessageResolve,
  onMessageCreate,
  defaultSixWeeks = getCurrentSixWeeks() // Add default value
}) => {
  // Add Supabase client initialization at the top with other state
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });

  // Initialize collapsedColumns with all assignment IDs
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(() => 
    new Set(Object.keys(assignments).filter(id => 
      assignments[id].periods.includes(activeTab)
    ))
  );
  // Initialize color settings to show type colors by default
  const [showColors, setShowColors] = useState(true);
  const [colorMode, setColorMode] = useState<'none' | 'subject' | 'type' | 'status'>('type');
  // Add temporary grade storage
  const [tempGrades, setTempGrades] = useState<Record<string, string>>({});

  // Add new state at the top with other state declarations
  const [assignmentSort, setAssignmentSort] = useState<'asc' | 'desc'>('asc');

  // Update debug logging to be more focused
  const debugLog = (context: string, data: any, studentId?: string) => {
    // Only log if it's a specific student interaction
    if (studentId) {
      console.log(`[Grade Debug] ${context} - Student ${studentId}:`, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Convert assignments to array and sort by date
  const sortedAssignments = Object.entries(assignments)
    .filter(([, assignment]) => assignment.periods.includes(activeTab))
    .sort(([, a], [, b]) => {
      const dateA = a.date.getTime();
      const dateB = b.date.getTime();
      return assignmentSort === 'desc' ? dateB - dateA : dateA - dateB;
    })
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
    const studentGrades = sortedAssignments.map(assignment => {
      const grade = getGradeValue(assignment.id, activeTab, student.id.toString());
      const extra = extraPoints[`${assignment.id}-${activeTab}-${student.id}`] || '0';
      const total = calculateTotal(grade, extra);
      return {
        total,
        type: assignment.type
      };
    });

    // Extract arrays for weighted average calculation
    const gradeValues = studentGrades.map(g => g.total);
    const types = studentGrades.map(g => g.type);

    return calculateWeightedAverage(gradeValues, types);
  };

  // Add save function for the roster view
  const handleSaveAll = async () => {
    try {
      toast({
        title: "Saving grades...",
        description: "Please wait while your changes are saved."
      });

      const assignmentsToSave = sortedAssignments
        .filter(assignment => 
          editingGrades[`${assignment.id}-${activeTab}`] ||
          Object.keys(unsavedGrades[assignment.id] || {}).includes(activeTab)
        );

      if (assignmentsToSave.length === 0) {
        toast({
          title: "No Changes",
          description: "No unsaved changes to save"
        });
        return;
      }

      // Save each assignment's grades
      const results = await Promise.all(
        assignmentsToSave.map(assignment => saveGrades(assignment.id))
      );

      const successCount = results.filter(Boolean).length;
      const failCount = results.length - successCount;

      if (failCount === 0) {
        toast({
          title: "Success",
          description: `Saved all ${successCount} assignments successfully`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Warning",
          description: `Saved ${successCount} assignments, but ${failCount} failed`
        });
      }

      // Clear editing states for successful saves
      assignmentsToSave.forEach(assignment => {
        setEditingGrades(prev => ({
          ...prev,
          [`${assignment.id}-${activeTab}`]: false
        }));
      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save grades. Please try again."
      });
    }
  };

  // Add column color helper
  const getColumnHeaderClass = (assignment: Assignment, isCollapsed: boolean) => {
    return cn(
      "relative transition-all duration-200 cursor-pointer group hover:bg-accent",
      isCollapsed ? "w-12 min-w-[3rem]" : "w-32 min-w-[8rem]",
      showColors && colorMode === 'type' && TYPE_COLORS[assignment.type],
      showColors && colorMode === 'status' && STATUS_COLORS[assignment.status || 'not_started'].bg
    );
  };

  const getGradeTotal = (assignmentId: string, studentId: string) => {
    const grade = getGradeValue(assignmentId, activeTab, studentId);
    const extra = extraPoints[`${assignmentId}-${activeTab}-${studentId}`] || '0';
    return calculateTotal(grade, extra);
  };

  // Add this new component inside RosterView
  const AssignmentColumnFooter = ({ 
    assignmentId, 
    activeTab, 
    hasUnsavedChanges, 
    onSave 
  }: { 
    assignmentId: string;
    activeTab: string;
    hasUnsavedChanges: boolean;
    onSave: () => Promise<void>;
  }) => (
    <div className="sticky bottom-0 p-2 bg-background border-t">
      <Button 
        size="sm" 
        className="w-full"
        disabled={!hasUnsavedChanges}
        onClick={onSave}
      >
        <Save className="h-3 w-3 mr-1" />
        Save
      </Button>
    </div>
  );

  // Add this helper function inside RosterView component
  const hasUnsavedChanges = (assignmentId: string) => {
    return editingGrades[`${assignmentId}-${activeTab}`] || 
      Object.keys(unsavedGrades[assignmentId] || {}).includes(activeTab);
  };

  // Add helper function to maintain extra points while updating grades
  const handleGradeChange = (assignmentId: string, periodId: string, studentId: string, newGrade: string) => {
    debugLog('handleGradeChange', {
      assignmentId,
      periodId,
      studentId,
      newGrade,
      currentExtraPoints: extraPoints[`${assignmentId}-${periodId}-${studentId}`]
    });

    const key = `${assignmentId}-${periodId}-${studentId}`;
    setTempGrades(prev => ({
      ...prev,
      [key]: newGrade
    }));

    // Then update unsavedGrades to trigger parent update
    setUnsavedGrades(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [periodId]: {
          ...prev[assignmentId]?.[periodId],
          [studentId]: newGrade
        }
      }
    }));

    // Mark as editing
    setEditingGrades(prev => ({
      ...prev,
      [`${assignmentId}-${periodId}`]: true
    }));

    debugLog('handleGradeChange', {
      key,
      newGrade,
      currentExtra: extraPoints[key]
    }, studentId);
  };

  // Add handleExtraPointsChange function
  const handleExtraPointsChange = (assignmentId: string, periodId: string, studentId: string, points: string) => {
    const key = `${assignmentId}-${periodId}-${studentId}`;
    setTempGrades(prev => ({
      [`${key}_extra`]: points // Store extra points separately in tempGrades
    }));

    // Update parent state
    onExtraPointsChange(assignmentId, periodId, studentId, points);
  };

  // Update handleSaveGrade to handle both grade and extra points
  const handleSaveGrade = async (assignmentId: string, periodId: string, studentId: string) => {
    const key = `${assignmentId}-${periodId}-${studentId}`;
    const newGrade = tempGrades[key];
    const newExtra = tempGrades[`${key}_extra`];

    debugLog('handleSaveGrade Start', {
      newGrade,
      newExtra,
      key
    }, studentId);

    if (!newGrade && !newExtra) return;

    try {
      // Update parent state
      if (newGrade) {
        onGradeChange(assignmentId, periodId, studentId, newGrade);
      }
      if (newExtra) {
        onExtraPointsChange(assignmentId, periodId, studentId, newExtra);
      }

      // Update editing state
      setEditingGrades(prev => ({
        ...prev,
        [`${assignmentId}-${periodId}`]: true
      }));

      // Clear temporary values after successful save
      setTempGrades(prev => {
        const next = { ...prev };
        delete next[key];
        delete next[`${key}_extra`];
        return next;
      });

      debugLog('handleSaveGrade Complete', {
        savedGrade: newGrade,
        savedExtra: newExtra,
        total: calculateTotal(newGrade || '0', newExtra || '0')
      }, studentId);

    } catch (error) {
      debugLog('handleSaveGrade Error', { error }, studentId);
      console.error('Error saving grade:', error);
    }
  };

  // Updated GradeCell component with proper initial/extra point handling
  const GradeCell: FC<{
    assignmentId: string;
    studentId: string;
    periodId: string;
    initialGrade: string;
    extraPoints: string;
    onGradeChange: (grade: string) => void;
    onExtraPointsChange: (points: string) => void;
    onSave: () => void;
    messages: Message[];
    onMessageResolve: (messageId: string) => Promise<void>;
    onMessageCreate: (message: string) => Promise<void>;
  }> = ({ 
    assignmentId, 
    studentId, 
    periodId, 
    initialGrade,
    extraPoints, 
    onGradeChange,
    onExtraPointsChange,
    onSave,
    messages,
    onMessageResolve,
    onMessageCreate,
  }) => {
    const [state, setState] = useState({
      grade: initialGrade || '0',
      extra: extraPoints || '0'
    });

    // Update local state when parent state changes
    useEffect(() => {
      setState({
        grade: initialGrade || '0',
        extra: extraPoints || '0'
      });
    }, [initialGrade, extraPoints]);

    const total = calculateTotal(state.grade, state.extra);
    const hasChanges = state.grade !== initialGrade || state.extra !== extraPoints;

    // Update parent's tempGrades immediately when saving
    const handleSave = () => {
      if (!hasChanges) return;

      debugLog('GradeCell Save', {
        before: {
          grade: initialGrade,
          extra: extraPoints,
        },
        after: {
          grade: state.grade,
          extra: state.extra,
        },
        total
      }, studentId);

      // Update parent's tempGrades directly
      const key = `${assignmentId}-${periodId}-${studentId}`;
      setTempGrades(prev => ({
        ...prev,
        [key]: state.grade,
        [`${key}_extra`]: state.extra
      }));

      // Then call the parent handlers
      onGradeChange(state.grade);
      onExtraPointsChange(state.extra);
      onSave();
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="w-full h-8 flex items-center justify-center cursor-pointer hover:bg-accent/50 relative">
            <span className={getGradeDisplayClass(total)}>
              {formatGradeDisplay(total)} {/* <-- Let's debug this */}
            </span>
            <MessageIndicator count={messages.filter(m => m.status === 'unread').length} />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="text-sm text-muted-foreground">Initial Grade:</span>
                <Input
                  type="text"
                  className="h-7"
                  value={state.grade === null ? '' : state.grade}
                  onChange={(e) => setState(prev => ({ 
                    ...prev, 
                    grade: e.target.value.trim() === '' ? null : e.target.value 
                  }))}
                  placeholder="-"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="text-sm text-muted-foreground">Extra Points:</span>
                <Input
                  type="text"
                  className="h-7"
                  value={state.extra}
                  onChange={(e) => setState(prev => ({ ...prev, extra: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="text-sm font-medium">{total}</span>
              </div>
              <Button 
                className="w-full mt-2" 
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges}
              >
                Save Changes
              </Button>
            </div>
            <div className="border-t pt-2">
              <MessagePanel 
                messages={messages}
                onResolve={onMessageResolve}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  useEffect(() => {
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          // Update message indicator counts
          switch (payload.eventType) {
            case 'INSERT':
              if (payload.new.status === 'unread') {
                const newMessage = payload.new as Message;
                // Show visual feedback for new messages
                const cell = document.querySelector(
                  `[data-cell="${newMessage.assignment_id}-${newMessage.student_id}"]`
                );
                if (cell) {
                  cell.classList.add('bg-red-50');
                  setTimeout(() => {
                    cell.classList.remove('bg-red-50');
                  }, 2000);
                }
              }
              break;
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [currentSixWeeks, setCurrentSixWeeks] = useState<string>(defaultSixWeeks);
  
  // Filter assignments by current six weeks period
  const filteredAssignments = useMemo(() => {
    return Object.entries(assignments)
      .filter(([_, assignment]) => assignment.six_weeks_period === currentSixWeeks)
      .reduce((acc, [id, assignment]) => ({
        ...acc,
        [id]: assignment
      }), {});
  }, [assignments, currentSixWeeks]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <ImportScoresDialog
            assignmentId={sortedAssignments[0]?.id}
            periodId={activeTab}
            onImport={handleImportGrades}
            unsavedGrades={unsavedGrades}
            setUnsavedGrades={setUnsavedGrades}
            setEditingGrades={setEditingGrades}
            assignments={assignments}
            students={students}
            grades={grades}
          />
          {/* GradeExportDialog removed from here */}
          <ColorSettings
            showColors={showColors}
            colorMode={colorMode}
            onShowColorsChange={setShowColors}
            onColorModeChange={setColorMode}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAssignmentSort(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2"
          >
            {assignmentSort === 'desc' ? (
              <>
                Latest First
                <ChevronDown className="h-4 w-4" />
              </>
            ) : (
              <>
                Earliest First
                <ChevronUp className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        <Button 
          onClick={handleSaveAll}
          variant="default"
          className="w-full sm:w-auto"
        >
          Save All Changes
        </Button>
      </div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="min-w-[800px] border rounded-md"> {/* Set minimum width */}
          <Table>
            <TableHeader>
              <TableRow className="h-[160px]">{/* Remove extra whitespace */}
                <TableHead className="sticky left-0 top-0 bg-background z-50 w-[200px] min-w-[200px]">
                  Student
                </TableHead>
                <TableHead className="sticky left-0 top-0 bg-background z-50 w-[100px] min-w-[100px]">
                  Average
                </TableHead>
                {sortedAssignments.map((assignment, index) => (
                  <TableHead 
                    key={assignment.id} 
                    onClick={() => toggleColumn(assignment.id)}
                    className={getColumnHeaderClass(assignment, collapsedColumns.has(assignment.id))}
                    style={{ zIndex: 40 - index }}
                  >
                    <div 
                      className={cn(
                        "absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-2 px-1",
                        "transition-all duration-200",
                        collapsedColumns.has(assignment.id) ? "opacity-0" : "opacity-100"
                      )}
                    >
                      <div className="line-clamp-2 text-center text-sm font-medium w-full">
                        {assignment.name}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(assignment.date, 'MM/dd')} - {assignment.type}
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
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex flex-col items-center rotate-90">
                          <ChevronDown className="h-3 w-3 mb-1" />
                          <span className="text-xs whitespace-nowrap">
                            {formatAssignmentDate(assignment.date, true)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableHead>
                ))}
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
                    <TableCell className="sticky left-0 bg-background z-40 font-medium text-right">
                      {average}%
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
                          <GradeCell
                            assignmentId={assignment.id}
                            studentId={student.id.toString()}
                            periodId={activeTab}
                            initialGrade={getGradeValue(assignment.id, activeTab, student.id.toString())}
                            extraPoints={extraPoints[`${assignment.id}-${activeTab}-${student.id}`] || '0'}
                            onGradeChange={(value) => handleGradeChange(
                              assignment.id,
                              activeTab,
                              student.id.toString(),
                              value
                            )}
                            onExtraPointsChange={(value) => handleExtraPointsChange(
                              assignment.id,
                              activeTab,
                              student.id,
                              value
                            )}
                            onSave={() => handleSaveGrade(assignment.id, activeTab, student.id.toString())}
                            messages={messages.filter(m => m.assignmentId === assignment.id && m.studentId === student.id)}
                            onMessageResolve={onMessageResolve}
                            onMessageCreate={(message) => onMessageCreate(student.id, assignment.id, message, 'grade_question')}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-8 text-sm font-medium">
                            {getGradeTotal(assignment.id, student.id.toString()) || '-'}
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
            <tfoot>
              <tr>
                <td className="sticky left-0 bg-background z-40" colSpan={2}></td>
                {sortedAssignments.map((assignment) => (
                  <td 
                    key={`footer-${assignment.id}`} 
                    className={cn(
                      "p-2 border-t text-center",
                      collapsedColumns.has(assignment.id) ? "w-12" : "w-32"
                    )}
                  >
                    <Save 
                      className={cn(
                        "h-4 w-4 inline-block transition-opacity cursor-pointer",
                        hasUnsavedChanges(assignment.id) 
                          ? "text-primary hover:text-primary/80" 
                          : "text-muted-foreground/40 cursor-default"
                      )}
                      onClick={() => hasUnsavedChanges(assignment.id) && saveGrades(assignment.id, activeTab)}
                    />
                  </td>
                ))}
              </tr>
            </tfoot>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default RosterView;
