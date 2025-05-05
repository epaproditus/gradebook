'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Save, ChevronDown, ChevronUp, Download, ChevronLeft, ChevronRight, PlusCircle, RefreshCw, Copy, FileUp, Import } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { startOfWeek, addDays, isSameDay, format } from 'date-fns';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Calendar as CalendarIcon } from 'lucide-react';
import { CreateAssignmentDialog } from './CreateAssignmentDialog';
import { CreateAssignmentDialog } from './CreateAssignmentDialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import CustomWeekView from './WeekView'; // Update import name to avoid confusion
import { Assignment, Student, AssignmentTag, GradeData, Message } from '@/types/gradebook';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { v4 as uuidv4 } from 'uuid';  // Add this import at the top
import { useSession } from 'next-auth/react';
import { getGradesForSync } from '@/lib/gradeSync';
import debounce from 'lodash/debounce';
import { loadConfig, saveConfig, defaultConfig, loadNavigationState, saveNavigationState } from '@/lib/storage';
import RosterView from './RosterView';
import { LayoutGrid, Table } from 'lucide-react';
import CalendarView from './CalendarView';
import { STATUS_COLORS, TYPE_COLORS, SUBJECT_COLORS } from '@/lib/constants';
import { SignOutButton } from './SignOutButton';
import { calculateTotal, calculateWeightedAverage } from '@/lib/gradeCalculations';
import { FlagInbox } from './FlagInbox';
import { getCurrentSixWeeks, getSixWeeksForDate } from '@/lib/dateUtils';
import { SixWeeksSelector } from './SixWeeksSelector';  // Add this line near other imports
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ImportScoresDialog } from './ImportScoresDialog';  // Import the component
import { GradeExportDialog } from './GradeExportDialog'; // Import the standalone component
import { BulkActionsDialog } from './BulkActionsDialog';  // Import the component alongside other imports
import { BulkImportDialog } from './BulkImportDialog';  // Add the BulkImportDialog import

// Initialize Supabase client (this is fine outside component)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Move interfaces outside component

interface ExportDialogProps {
  assignments: Record<string, Assignment>;
  students: Record<string, Student[]>;
  onExport: (assignments: string[], periods: string[], merge: boolean) => void;
}

// Update BirthdayListProps interface
interface BirthdayListProps {
  students: Student[];
  currentDate: Date;  // Changed from currentMonth
  view: 'month' | 'week';  // Added view prop
}

interface DMACScore {
  LocalID: string;
  Score: string;
  // ... other DMAC fields if needed
}

// Update BirthdayList component
const BirthdayList: FC<BirthdayListProps> = ({ students, currentDate, view }) => {
  const getBirthdaysInRange = (startDate: Date, endDate: Date) => {
    return students.filter(student => {
      if (!student.birthday) return false;
      const [_, month, day] = student.birthday.split('-').map(Number);
      const birthdayDate = new Date(currentDate.getFullYear(), month - 1, day);
      return birthdayDate >= startDate && birthdayDate <= endDate;
    });
  };

  const birthdays = view === 'week' 
    ? getBirthdaysInRange(
        startOfWeek(currentDate), 
        addDays(startOfWeek(currentDate), 6)
      )
    : getBirthdaysInRange(
        new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      );

  return birthdays.length > 0 ? (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Birthdays this {view}:</h3>
      {birthdays.map(student => {
        const [_, month, day] = student.birthday.split('-').map(Number);
        return (
          <div key={student.id} className="text-sm flex gap-2 items-center">
            <span className="w-6">{day}</span>
            <span>🎂</span>
            <span>{student.name}</span>
          </div>
        );
      })}
    </div>
  ) : null;
};

// New component for week view
const WeekView: FC<{
  date: Date;
  onDateSelect: (date: Date) => void;
  assignments: Record<string, Assignment>;
}> = ({ date, onDateSelect, assignments }) => {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className={cn(
            "p-2 border rounded hover:bg-secondary cursor-pointer",
            isSameDay(day, date) && "bg-primary text-primary-foreground",
            Object.values(assignments).some(
              (assignment) => isSameDay(assignment.date, day)
            ) && "border-primary border-2"
          )}
          onClick={() => onDateSelect(day)}
        >
          <div className="text-sm font-medium">{format(day, 'EEE')}</div>
          <div className="text-lg">{format(day, 'd')}</div>
        </div>
      ))}
    </div>
  );
};

const StudentSearch: FC<{
  students: Record<string, Student[]>;
  onStudentSelect: (student: Student) => void;
}> = ({ students, onStudentSelect }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Student[]>([]);

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }

    const searchLower = search.toLowerCase();
    const matches = Object.values(students)
      .flat()
      .filter(student => 
        String(student.id).toLowerCase().includes(searchLower) ||
        student.name.toLowerCase().includes(searchLower)
      );

    setResults(matches);
  }, [search, students]);

  return (
    <div className="relative">
      <Input
        placeholder="Search by ID or name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2"
      />
      {results.length > 0 && (
        <Card className="absolute w-full z-50 max-h-64 overflow-y-auto">
          <CardContent className="p-2">
            {results.map(student => (
              <div
                key={student.id}
                className="p-2 hover:bg-secondary cursor-pointer rounded"
                onClick={() => {
                  onStudentSelect(student);
                  setSearch('');
                }}
              >
                <div className="font-medium">{student.name}</div>
                <div className="text-sm text-muted-foreground">
                  ID: {student.id} - Period {student.class_period}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Add this component inside GradeBook.tsx
const PeriodStudentSearch: FC<{
  students: Student[]; // Now takes all students
  assignmentId: string;  // Add this prop
  onSelect: (studentId: number, periodId: string) => void;  // Update this prop
  activeTab: string;
  onTabChange: (tabId: string) => void;
}> = ({ students, assignmentId, onSelect, activeTab, onTabChange }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Student[]>([]);

  useEffect(() => {
    if (search.length < 1) {
      setResults([]);
      return;
    }

    const searchLower = search.toLowerCase();
    const matches = students.filter(student => 
      String(student.id).toLowerCase().includes(searchLower) ||
      student.name.toLowerCase().includes(searchLower)
    );

    setResults(matches);
  }, [search, students]);

  return (
    <div className="relative mb-4">
      <Input
        placeholder="Search student by name or ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2"
      />
      {results.length > 0 && (
        <Card className="absolute w-full z-50 max-h-48 overflow-y-auto">
          <CardContent className="p-2">
            {results.map(student => (
              <div
                key={student.id}
                className="p-2 hover:bg-secondary cursor-pointer rounded"
                onClick={() => {
                  if (student.class_period !== activeTab) {
                    onTabChange(student.class_period);
                  }
                  onSelect(student.id, student.class_period);
                  setSearch('');
                }}
              >
                <div className="font-medium">{student.name}</div>
                <div className="text-sm text-muted-foreground">
                  ID: {student.id} - Period {student.class_period}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Add ColorSettings component at the top level
const ColorSettings: FC<{
  showColors: boolean;
  colorMode: 'none' | 'subject' | 'type' | 'status';
  onShowColorsChange: (show: boolean) => void;
  onColorModeChange: (mode: 'none' | 'subject' | 'type' | 'status') => void;
}> = ({ showColors, colorMode, onShowColorsChange, onColorModeChange }) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={showColors}
          onCheckedChange={(checked) => {
            onShowColorsChange(!!checked);
            if (checked) {
              // Auto-select status mode when enabling colors
              onColorModeChange('status');
            }
          }}
        />
        <span className="text-sm">Show Colors</span>
      </div>
      {showColors && (
        <Select
          value={colorMode}
          onValueChange={(value: 'none' | 'subject' | 'type' | 'status') => onColorModeChange(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Color by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Color by Status</SelectItem>
            <SelectItem value="subject">Color by Subject</SelectItem>
            <SelectItem value="type">Color by Type</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

// Add this utility function at the top level
const getCardClassName = (assignment: Assignment, isExpanded: boolean, colorMode: string, showColors: boolean) => {
  return cn(
    "mb-2 transition-all duration-200",
    isExpanded ? "col-span-2" : "",  // Make card span full width when expanded
    showColors && colorMode === 'subject' && SUBJECT_COLORS[assignment.subject],
    showColors && colorMode === 'type' && TYPE_COLORS[assignment.type],
    showColors && colorMode === 'status' && STATUS_COLORS[assignment.status || 'not_started'].bg
  );
};

// Update TodoList component
const TodoList: FC<{
  tags: AssignmentTag[];
  students: Record<string, Student[]>;
  assignments: Record<string, Assignment>;
  onRemoveTag: (tag: AssignmentTag) => Promise<void>;
}> = ({ tags, students, assignments, onRemoveTag }) => {
  const flatStudents = Object.values(students).flat();
  const getStudentName = (id: number) => flatStudents.find(s => s.id === id)?.name || '';

  const retestTags = tags.filter(tag => tag.tag_type === 'retest');
  const absentTags = tags.filter(tag => tag.tag_type === 'absent');

  // Group both retest and absent tags by assignment
  const retestByAssignment = retestTags.reduce((acc, tag) => {
    if (!acc[tag.assignment_id]) {
      acc[tag.assignment_id] = [];
    }
    acc[tag.assignment_id].push(tag);
    return acc;
  }, {} as Record<string, AssignmentTag[]>);

  const absentByAssignment = absentTags.reduce((acc, tag) => {
    if (!acc[tag.assignment_id]) {
      acc[tag.assignment_id] = [];
    }
    acc[tag.assignment_id].push(tag);
    return acc;
  }, {} as Record<string, AssignmentTag[]>);

  return (
    <div className="mt-4 space-y-2 text-sm">
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-red-600 font-semibold">
          <ChevronRight className="h-4 w-4" />
          Needs Retest ({retestTags.length})
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-1 pl-6 mt-1">
            {Object.entries(retestByAssignment).map(([assignmentId, tags]) => (
              <Collapsible key={assignmentId}>
                <CollapsibleTrigger className="flex items-center gap-2 text-red-600">
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-sm font-medium">
                    {assignments[assignmentId]?.name} ({tags.length})
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1 pl-6 mt-1">
                    {tags.map(tag => (
                      <div key={tag.id} className="flex items-center gap-2">
                        <Checkbox
                          className="h-3 w-3"
                          checked={false}
                          onCheckedChange={() => onRemoveTag(tag)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {getStudentName(tag.student_id)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-yellow-600 font-semibold">
          <ChevronRight className="h-4 w-4" />
          Absent ({absentTags.length})
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-1 pl-6 mt-1">
            {Object.entries(absentByAssignment).map(([assignmentId, tags]) => (
              <Collapsible key={assignmentId}>
                <CollapsibleTrigger className="flex items-center gap-2 text-yellow-600">
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-sm font-medium">
                    {assignments[assignmentId]?.name} ({tags.length})
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1 pl-6 mt-1">
                    {tags.map(tag => (
                      <div key={tag.id} className="flex items-center gap-2">
                        <Checkbox
                          className="h-3 w-3"
                          checked={false}
                          onCheckedChange={() => onRemoveTag(tag)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {getStudentName(tag.student_id)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Add new interface for assignment status options
type AssignmentStatus = 'in_progress' | 'completed' | 'not_started' | 'not_graded';

const GradeBook: FC = () => {
  const { toast } = useToast();
  const [autofillValue, setAutofillValue] = useState('');
  // Replace the individual state declarations with the loaded config
  const [showColors, setShowColors] = useState(loadConfig().showColors);
  const [colorMode, setColorMode] = useState(loadConfig().colorMode);
  const [groupBy, setGroupBy] = useState(loadConfig().groupBy);
  const [dateFilter, setDateFilter] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'none'>(loadConfig().dateFilter);
  const [subjectFilter, setSubjectFilter] = useState(loadConfig().subjectFilter);
  const [studentSortOrder, setStudentSortOrder] = useState(loadConfig().studentSortOrder);
  
  // Load navigation state on component mount
  const navState = loadNavigationState();
  const [sixWeeksFilter, setSixWeeksFilter] = useState<string>(getCurrentSixWeeks());
  const [viewMode, setViewMode] = useState<ViewMode>(navState.viewMode || 'assignment');
  const [activeTab, setActiveTab] = useState<string>(navState.lastActivePeriod || '');
  const [expandedAssignments, setExpandedAssignments] = useState<Record<string, boolean>>(
    navState.expandedAssignments || {}
  );

  // Add effect to save config when any related state changes
  useEffect(() => {
    const config = {
      showColors,
      colorMode,
      groupBy,
      dateFilter: dateFilter as 'asc' | 'desc' | 'none', // Backward compatible
      subjectFilter,
      studentSortOrder
    };
    saveConfig(config);
  }, [showColors, colorMode, groupBy, dateFilter, subjectFilter, studentSortOrder]);

  // Update ColorSettings component to handle persistence
  const handleShowColorsChange = (show: boolean) => {
    setShowColors(show);
    // Keep current color mode or set default to status when enabling
    if (show && colorMode === 'none') {
      setColorMode('status');
    }
  };

  // Move useState here
  
  // Rest of your state declarations
  const [students, setStudents] = useState<Record<string, Student[]>>({});
  const [birthdayStudents, setBirthdayStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [grades, setGrades] = useState<GradeData>({});
  const [unsavedGrades, setUnsavedGrades] = useState<GradeData>({});
  const [editingGrades, setEditingGrades] = useState<Record<string, boolean>>({});
  const [selectedType, setSelectedType] = useState<'Daily' | 'Assessment'>('Daily');
  const [absences, setAbsences] = useState<Record<string, boolean>>({});
  const [lateWork, setLateWork] = useState<Record<string, boolean>>({});
  const [incomplete, setIncomplete] = useState<Record<string, boolean>>({});
  const [extraPoints, setExtraPoints] = useState<Record<string, string>>({});
  const [retest, setRetest] = useState<Record<string, boolean>>({});
  const [tags, setTags] = useState<AssignmentTag[]>([]);
  const [assignmentOrder, setAssignmentOrder] = useState<string[]>([]);
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [syncingAssignments, setSyncingAssignments] = useState<Record<string, boolean>>({});
  const { data: session } = useSession();
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [localGrades, setLocalGrades] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageSubscription, setMessageSubscription] = useState<RealtimeChannel | null>(null);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, assignmentId: string, assignmentName: string }>({ isOpen: false, assignmentId: '', assignmentName: '' });

  // Add this function to handle student deletion/deactivation
  const deleteStudent = async (studentId: string): Promise<boolean> => {
    try {
      // Update student to be inactive instead of fully deleting
      const { error } = await supabase
        .from('students')
        .update({ is_active: false })
        .eq('id', studentId);

      if (error) throw error;

      // Update local state to remove the deactivated student
      setStudents(prev => {
        const updated = { ...prev };
        // Filter out the deactivated student from each period
        Object.keys(updated).forEach(period => {
          updated[period] = updated[period].filter(s => s.id.toString() !== studentId);
        });
        return updated;
      });

      return true;
    } catch (error) {
      console.error('Error deactivating student:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate student"
      });
      return false;
    }
  };
  
  // Add an alias for deactivateStudent to maintain backward compatibility
  const deactivateStudent = deleteStudent;

  // Fetch students from Supabase
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('is_active', true)  // Add filter to only fetch active students
          .order('class_period, name');

        if (error) {
          console.error('Error fetching students:', error);
          return;
        }

        console.log('Fetched students:', data); // Debug log

        // Organize students by period
        const studentsByPeriod = data.reduce((acc: Record<string, Student[]>, student: Student) => {
          if (!acc[student.class_period]) {
            acc[student.class_period] = [];
          }
          acc[student.class_period].push({
            ...student,
            period: student.class_period // Add this line to ensure period is set
          });
          return acc;
        }, {});

        console.log('Organized students:', studentsByPeriod); // Debug log
        setStudents(studentsByPeriod);
      } catch (error) {
        console.error('Error in fetchStudents:', error);
      }
    };

    fetchStudents();
  }, []);

  // Load assignments and grades on component mount
  useEffect(() => {
    console.log('Initializing gradebook - loading assignments and grades');
    const loadAssignments = async () => {
      // Load assignments with conditional six_weeks_period filter
      const query = supabase
        .from('assignments')
        .select('*');
      
      // Only apply the filter if sixWeeksFilter is set and not 'all'
      if (sixWeeksFilter && sixWeeksFilter !== 'all') {
        query.eq('six_weeks_period', sixWeeksFilter);
      }
  
      const { data: assignmentData, error: assignmentError } = await query;
  
      if (assignmentError) {
        console.error('Error loading assignments:', assignmentError);
        return;
      }
  
      const formattedAssignments = assignmentData.reduce((acc, assignment) => ({
        ...acc,
        [assignment.id]: {
          ...assignment,
          date: new Date(assignment.date + 'T00:00:00') // Add time component to prevent timezone shift
        }
      }), {});
  
      setAssignments(formattedAssignments);
      setAssignmentOrder(Object.keys(formattedAssignments));
  
      // Then load grades in a separate query
      console.log('Loading grades from Supabase...');
      const { data: gradeData, error: gradeError } = await supabase
        .from('grades')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('Grades loaded:', {
        count: gradeData?.length,
        sample: gradeData?.slice(0, 3),
        error: gradeError
      });
  
      if (gradeError) {
        console.error('Error loading grades:', gradeError);
        return;
      }
  
      // Create properly structured grade data
      const formattedGrades: GradeData = {};
      const loadedExtraPoints: Record<string, string> = {};
  
      gradeData?.forEach(grade => {
        if (!formattedGrades[grade.assignment_id]) {
          formattedGrades[grade.assignment_id] = {};
        }
        if (!formattedGrades[grade.assignment_id][grade.period]) {
          formattedGrades[grade.assignment_id][grade.period] = {};
        }
        
        // Only set grade if it exists and isn't empty
        if (grade.grade && grade.grade !== '0') {
          formattedGrades[grade.assignment_id][grade.period][grade.student_id] = grade.grade;
        }
        
        // Only set extra points if they exist and aren't zero
        if (grade.extra_points && grade.extra_points !== '0') {
          const key = `${grade.assignment_id}-${grade.period}-${grade.student_id}`;
          loadedExtraPoints[key] = grade.extra_points;
        }
      });
  
      setGrades(formattedGrades);
      setExtraPoints(loadedExtraPoints);
    };
  
    loadAssignments();
  }, [sixWeeksFilter]);

  // Add function to load tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const { data, error } = await supabase
          .from('assignment_tags')
          .select('*');
        
        if (error) throw error;
        setTags(data);
      } catch (error) {
        console.error('Error loading tags:', error);
        alert('Failed to load assignment tags');
      }
    };

    loadTags();
  }, []);

  // Check for birthdays on date selection
  const checkBirthdays = (date: Date) => {
    const selectedMonth = date.getMonth() + 1;
    const selectedDay = date.getDate();

    const birthdayStudents = Object.values(students)
      .flat()
      .filter(student => {
        if (!student.birthday) return false;
        const [year, month, day] = student.birthday.split('-').map(Number);
        return month === selectedMonth && day === selectedDay;
      });

    setBirthdayStudents(birthdayStudents);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      checkBirthdays(date);
    }
  };

  // Handle week change
  const handleWeekChange = (newDate: Date) => {
    setSelectedDate(newDate);
    checkBirthdays(newDate);
  };

  // Add a new button for creating assignments
const debouncedSaveGrades = useCallback(
  debounce(async (assignmentId: string) => {
    try {
      const assignment = assignments[assignmentId];
      if (!assignment) return;

      // Get all changes for this assignment
      const batchUpdates = Object.entries(localGrades)
        .filter(([key]) => key.startsWith(`${assignmentId}-`))
        .reduce((acc, [key, grade]) => {
          const [_, __, periodId, studentId] = key.split('-');
          if (!acc[periodId]) acc[periodId] = {};
          acc[periodId][studentId] = grade;
          return acc;
        }, {} as Record<string, Record<string, string>>);

      // Only proceed if we have changes
      if (Object.keys(batchUpdates).length === 0) return;

      // Update unsaved grades
      setUnsavedGrades(prev => ({
        ...prev,
        [assignmentId]: {
          ...prev[assignmentId],
          ...batchUpdates
        }
      }));

      // Clear local grades for this assignment
      setLocalGrades(prev => {
        const next = { ...prev };
        Object.keys(next)
          .filter(key => key.startsWith(`${assignmentId}-`))
          .forEach(key => delete next[key]);
        return next;
      });

      // Proceed with save to database
      // ...rest of your existing save logic...
    } catch (error) {
      console.error('Error auto-saving grades:', error);
    }
  }, 2500),
  [assignments, localGrades]
);

const handleGradeChange = (assignmentId: string, periodId: string, studentId: string, grade: string) => {
  const key = `${assignmentId}-${periodId}-${studentId}`;
  const extraPoint = extraPoints[key] || '0';
  
  // Calculate total grade considering extra points
  const totalGrade = calculateTotal(grade, extraPoint).toString();
  
  setLocalGrades(prev => ({
    ...prev,
    [key]: totalGrade // Save the total grade instead of just the initial grade
  }));

  // If we have a valid grade, trigger save
  if (totalGrade !== '') {
    setEditingGrades(prev => ({
      ...prev,
      [`${assignmentId}-${periodId}`]: true
    }));

    setUnsavedGrades(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [periodId]: {
          ...prev[assignmentId]?.[periodId],
          [studentId]: totalGrade // Save total grade here too
        }
      }
    }));

    debouncedSaveGrades(assignmentId);
  }
};

const getGradeValue = (assignmentId: string, periodId: string, studentId: string) => {
  // Enhanced debug logging with more context
  const debugData = {
    assignment: assignments[assignmentId]?.name,
    student: students[periodId]?.find(s => s.id === parseInt(studentId))?.name,
    sources: {
      supabase: {
        value: grades[assignmentId]?.[periodId]?.[studentId],
        exists: grades[assignmentId]?.[periodId]?.[studentId] !== undefined
      },
      unsaved: {
        value: unsavedGrades[assignmentId]?.[periodId]?.[studentId],
        exists: unsavedGrades[assignmentId]?.[periodId]?.[studentId] !== undefined
      },
      local: {
        value: localGrades[`${assignmentId}-${periodId}-${studentId}`],
        exists: localGrades[`${assignmentId}-${periodId}-${studentId}`] !== undefined
      }
    },
    states: {
      isEditing: editingGrades[`${assignmentId}-${periodId}`],
      hasExtraPoints: extraPoints[`${assignmentId}-${periodId}-${studentId}`] !== undefined
    }
  };

  // Get values from all sources
  const supabaseGrade = grades[assignmentId]?.[periodId]?.[studentId];
  const unsavedGrade = unsavedGrades[assignmentId]?.[periodId]?.[studentId];
  const localGrade = localGrades[`${assignmentId}-${periodId}-${studentId}`];

  // Determine final value with clearer priority
  let finalGrade = '';
  
  // 1. Check for local edits first (immediate feedback)
  if (localGrade !== undefined && localGrade !== '') {
    finalGrade = localGrade;
    debugData.resolvedFrom = 'local';
  } 
  // 2. Check unsaved changes if in editing mode
  else if (editingGrades[`${assignmentId}-${periodId}`] && unsavedGrade !== undefined) {
    finalGrade = unsavedGrade;
    debugData.resolvedFrom = 'unsaved';
  }
  // 3. Fall back to Supabase value
  else if (supabaseGrade !== undefined) {
    // Only use Supabase value if it's not empty/zero
    finalGrade = supabaseGrade !== '0' ? supabaseGrade : '';
    debugData.resolvedFrom = supabaseGrade === '0' ? 'supabase (ignored zero)' : 'supabase';
  }

  console.log('Grade resolution:', {
    ...debugData,
    finalGrade,
    assignmentId,
    periodId, 
    studentId
  });

  return finalGrade;
};

const deleteAssignment = async (assignmentId: string) => {
  console.log('Beginning delete process for assignment:', assignmentId);
  
  try {
    toast({
      title: "Deleting...",
      description: "Removing assignment and related data"
    });

    // Delete in order of dependencies (child records first)
    console.log('Deleting assignment flags for assignment:', assignmentId);
    const { error: flagsError } = await supabase
      .from('assignment_flags')
      .delete()
      .eq('assignment_id', assignmentId);
    
    if (flagsError) {
      console.error('Error deleting assignment flags:', flagsError);
      // Continue with deletion even if some related records fail
    }

    console.log('Deleting tags for assignment:', assignmentId);
    const { error: tagsError } = await supabase
      .from('assignment_tags')
      .delete()
      .eq('assignment_id', assignmentId);
    
    if (tagsError) {
      console.error('Error deleting tags:', tagsError);
      // Continue with deletion even if some related records fail
    }

    console.log('Deleting grades for assignment:', assignmentId);
    const { error: gradesError } = await supabase
      .from('grades')
      .delete()
      .eq('assignment_id', assignmentId);

    if (gradesError) {
      console.error('Error deleting grades:', gradesError);
      // Continue with deletion even if some related records fail
    }

    // Check for and delete Google Classroom links
    console.log('Deleting Google Classroom links for assignment:', assignmentId);
    const { error: linksError } = await supabase
      .from('google_classroom_links')
      .delete()
      .eq('assignment_id', assignmentId);

    if (linksError) {
      console.error('Error deleting Google Classroom links:', linksError);
      // Continue with deletion even if some related records fail
    }

    // Check for and delete any extra points
    console.log('Deleting extra points for assignment:', assignmentId);
    const { error: extraPointsError } = await supabase
      .from('extra_points')
      .delete()
      .eq('assignment_id', assignmentId);

    if (extraPointsError) {
      console.error('Error deleting extra points:', extraPointsError);
      // Continue with deletion even if some related records fail
    }

    // Check for and delete any assignment notes
    console.log('Deleting assignment notes for assignment:', assignmentId);
    const { error: notesError } = await supabase
      .from('assignment_notes')
      .delete()
      .eq('assignment_id', assignmentId);

    if (notesError) {
      console.error('Error deleting assignment notes:', notesError);
      // Continue with deletion even if some related records fail
    }

    console.log('Deleting assignment with ID:', assignmentId);
    // Finally delete the assignment itself
    const { error: assignmentError } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (assignmentError) {
      throw assignmentError;
    }

    // Update local state
    console.log('Updating local state after successful deletion');
    setAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[assignmentId];
      return newAssignments;
    });

    setAssignmentOrder(prev => prev.filter(id => id !== assignmentId));
    setTags(prev => prev.filter(tag => tag.assignment_id !== assignmentId));
    setFlags(prev => prev.filter(flag => flag.assignment_id !== assignmentId));

    // Clear any related grades
    setGrades(prev => {
      const newGrades = { ...prev };
      delete newGrades[assignmentId];
      return newGrades;
    });

    setUnsavedGrades(prev => {
      const newUnsaved = { ...prev };
      delete newUnsaved[assignmentId];
      return newUnsaved;
    });

    toast({
      title: "Success",
      description: "Assignment deleted successfully"
    });

  } catch (error) {
    console.error('Error deleting assignment:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error instanceof Error ? error.message : 'Failed to delete assignment'
    });
  }
};

// Add bulk delete assignments functionality
const bulkDeleteAssignments = async (assignmentIds: string[]): Promise<void> => {
  try {
    toast({
      title: "Deleting assignments...",
      description: `Removing ${assignmentIds.length} assignments`,
    });

    // Create arrays to track successfully deleted assignments and errors
    const successfullyDeleted: string[] = [];
    const errors: { id: string, error: any }[] = [];

    // Process deletions sequentially to avoid overwhelming the database
    for (const assignmentId of assignmentIds) {
      try {
        console.log(`Starting deletion process for assignment: ${assignmentId}`);
        
        // Check if the assignment exists before attempting deletion
        const { data: assignmentCheck, error: checkError } = await supabase
          .from('assignments')
          .select('id')
          .eq('id', assignmentId)
          .single();
          
        if (checkError || !assignmentCheck) {
          console.error(`Assignment ${assignmentId} not found in database:`, checkError);
          errors.push({ id: assignmentId, error: 'Assignment not found' });
          continue; // Skip to the next assignment
        }

        // 1. Delete assignment flags
        const { error: flagsError } = await supabase
          .from('assignment_flags')
          .delete()
          .eq('assignment_id', assignmentId);
        
        if (flagsError) {
          console.error('Error deleting assignment flags:', flagsError);
          // Continue with deletion as this might be empty
        }

        // 2. Delete assignment tags
        const { error: tagsError } = await supabase
          .from('assignment_tags')
          .delete()
          .eq('assignment_id', assignmentId);
        
        if (tagsError) {
          console.error('Error deleting assignment tags:', tagsError);
          // Continue with deletion as this might be empty
        }

        // 3. Delete grades
        const { error: gradesError } = await supabase
          .from('grades')
          .delete()
          .eq('assignment_id', assignmentId);

        if (gradesError) {
          console.error('Error deleting grades:', gradesError);
          // Continue with deletion as this might be empty
        }

        // 4. Delete Google Classroom links
        const { error: linksError } = await supabase
          .from('google_classroom_links')
          .delete()
          .eq('assignment_id', assignmentId);

        if (linksError) {
          console.error('Error deleting Google Classroom links:', linksError);
          // Continue with deletion as this might be empty
        }

        // 5. Delete extra points
        const { error: extraPointsError } = await supabase
          .from('extra_points')
          .delete()
          .eq('assignment_id', assignmentId);

        if (extraPointsError) {
          console.error('Error deleting extra points:', extraPointsError);
          // Continue with deletion as this might be empty
        }

        // 6. Delete assignment notes
        const { error: notesError } = await supabase
          .from('assignment_notes')
          .delete()
          .eq('assignment_id', assignmentId);

        if (notesError) {
          console.error('Error deleting assignment notes:', notesError);
          // Continue with deletion as this might be empty
        }

        // 7. Finally, delete the assignment itself
        const { error: assignmentError } = await supabase
          .from('assignments')
          .delete()
          .eq('id', assignmentId);

        if (assignmentError) {
          throw assignmentError; // This is critical, so throw error
        }

        // Verify the assignment was actually deleted
        const { data: verifyDelete, error: verifyError } = await supabase
          .from('assignments')
          .select('id')
          .eq('id', assignmentId);
          
        if (!verifyError && verifyDelete && verifyDelete.length > 0) {
          throw new Error(`Assignment ${assignmentId} still exists after deletion attempt`);
        }

        // If we get here, the assignment was successfully deleted
        console.log(`Successfully deleted assignment: ${assignmentId}`);
        successfullyDeleted.push(assignmentId);
      } catch (err) {
        console.error(`Failed to delete assignment ${assignmentId}:`, err);
        errors.push({ id: assignmentId, error: err });
      }
    }

    // Check if any assignments were successfully deleted
    if (successfullyDeleted.length === 0) {
      throw new Error("Failed to delete any assignments");
    }

    // Update local state for successfully deleted assignments
    setAssignments(prev => {
      const newAssignments = { ...prev };
      successfullyDeleted.forEach(id => {
        delete newAssignments[id];
      });
      return newAssignments;
    });

    setAssignmentOrder(prev => prev.filter(id => !successfullyDeleted.includes(id)));
    setTags(prev => prev.filter(tag => !successfullyDeleted.includes(tag.assignment_id)));
    setFlags(prev => prev.filter(flag => !successfullyDeleted.includes(flag.assignment_id)));

    // Clear grades for deleted assignments
    setGrades(prev => {
      const newGrades = { ...prev };
      successfullyDeleted.forEach(id => {
        delete newGrades[id];
      });
      return newGrades;
    });

    setUnsavedGrades(prev => {
      const newUnsaved = { ...prev };
      successfullyDeleted.forEach(id => {
        delete newUnsaved[id];
      });
      return newUnsaved;
    });

    // Show appropriate toast based on results
    if (errors.length === 0) {
      toast({
        title: "Success",
        description: `${successfullyDeleted.length} assignments deleted successfully`
      });
    } else if (successfullyDeleted.length > 0) {
      toast({
        variant: "default",
        title: "Partial Success",
        description: `${successfullyDeleted.length} assignments deleted, ${errors.length} failed`
      });
    } else {
      // This shouldn't happen due to the earlier check, but just in case
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete any assignments. Please try again."
      });
    }

  } catch (error) {
    console.error('Error bulk deleting assignments:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to delete assignments. Please try again."
    });
  }
};

const saveGrades = async (assignmentId: string) => {
  try {
    const assignment = assignments[assignmentId];
    if (!assignment) return;

    toast({
      title: "Saving grades...",
      description: "Please wait while your changes are saved.",
    });

    // First, get all existing grades
    const existingGrades = grades[assignmentId] || {};

    // Collect all the grades we want to save
    const gradesToSave = assignment.periods.flatMap(periodId => {
      const periodGrades = {
        ...existingGrades[periodId],
        ...unsavedGrades[assignmentId]?.[periodId]
      };

      return Object.entries(periodGrades)
        .filter(([_, grade]) => grade !== '' && grade !== '0')
        .map(([studentId, grade]) => ({
          assignment_id: assignmentId,
          student_id: studentId,
          period: periodId,
          grade: grade,
          extra_points: parseInt(extraPoints[`${assignmentId}-${periodId}-${studentId}`] || '0')
        }));
    });

    if (gradesToSave.length > 0) {
      // First delete existing grades for this assignment
      const { error: deleteError } = await supabase
        .from('grades')
        .delete()
        .eq('assignment_id', assignmentId);

      if (deleteError) throw deleteError;

      // Then insert the new grades
      const { error: insertError } = await supabase
        .from('grades')
        .insert(gradesToSave);

      if (insertError) throw insertError;

      // Update local state
      setGrades(prev => ({
        ...prev,
        [assignmentId]: assignment.periods.reduce((acc, periodId) => ({
          ...acc,
          [periodId]: {
            ...prev[assignmentId]?.[periodId],
            ...unsavedGrades[assignmentId]?.[periodId]
          }
        }), {})
      }));

      // Clear editing state
      assignment.periods.forEach(periodId => {
        setEditingGrades(prev => ({
          ...prev,
          [`${assignmentId}-${periodId}`]: false
        }));
      });

      setUnsavedGrades(prev => {
        const updated = { ...prev };
        delete updated[assignmentId];
        return updated;
      });

      toast({
        title: "Success",
        description: `Saved ${gradesToSave.length} grades successfully`,
        variant: "success"
      });
    } else {
      toast({
        title: "No Changes",
        description: "No grades to save",
        variant: "default"
      });
    }
  } catch (error) {
    console.error('Error saving grades:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error instanceof Error 
        ? `Failed to save grades: ${error.message}`
        : "Failed to save grades. Please try again."
    });
  }
};

const saveAssignment = async () => {
  if (!newAssignment?.name || newAssignment.periods.length === 0) {
    alert('Please fill in assignment name and select at least one period');
    return;
  }

  try {
    // Create assignment data with a new UUID
    const assignmentData = {
      id: crypto.randomUUID(),
      name: newAssignment.name,
      date: newAssignment.date.toISOString().split('T')[0], // Use UTC date string
      type: selectedType,
      periods: newAssignment.periods,
      subject: newAssignment.subject,
      six_weeks_period: newAssignment.six_weeks_period,
      max_points: 100,
      created_at: new Date().toISOString()
    };

    console.log('Attempting to save assignment:', assignmentData);

    const { data, error } = await supabase
      .from('assignments')
      .insert([assignmentData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Update local state with the correct UUID
    setAssignments(prev => ({
      ...prev,
      [assignmentData.id]: {
        ...assignmentData,
        date: newAssignment.date
      }
    }));

    setAssignmentOrder(prev => [...prev, assignmentData.id]);
    setNewAssignment(null);
    setSelectedDate(null);

    toast({
      title: "Success",
      description: "Assignment created successfully"
    });

  } catch (error) {
    console.error('Error creating assignment:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: error instanceof Error ? error.message : 'Failed to create assignment'
    });
  }
};

const exportSingleGradeSet = (assignmentId: string, periodId: string) => {
  const assignment = assignments[assignmentId];
  const periodStudents = students[periodId] || [];
  const assignmentGrades = grades[assignmentId]?.[periodId] || {};

  // Function to escape commas in values
  const escapeCSV = (value: string) => {
    if (value.includes(',') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Create CSV data with comma separation
  const csvData = [
    ['Student ID', 'Final Grade', 'First Name', 'Last Name'].join(','),
    ...periodStudents.map(student => {
      const [lastName, firstName] = student.name.split(',').map(part => part.trim());
      const finalGrade = calculateTotal(
        assignmentGrades[student.id] || '0',
        extraPoints[`${assignmentId}-${periodId}-${student.id}`] || '0'
      );
      return [
        student.id,
        finalGrade,
        escapeCSV(firstName),
        escapeCSV(lastName)
      ].join(',');
    })
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Use assignment name in the filename, sanitize it for valid filename
  const sanitizedName = assignment.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  a.download = `${sanitizedName}_period${periodId}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const exportGrades = (assignmentIds: string[], periodIds: string[], merge: boolean) => {
  if (merge) {
    // Create one merged file for all selections
    const allData = assignmentIds.flatMap(assignmentId => 
      periodIds.flatMap(periodId => {
        const periodStudents = students[periodId] || [];
        const assignmentGrades = grades[assignmentId]?.[periodId] || {};

        return periodStudents.map(student => {
          const [lastName, firstName] = student.name.split(',').map(part => part.trim());
          const finalGrade = calculateTotal(
            assignmentGrades[student.id] || '0',
            extraPoints[`${assignmentId}-${periodId}-${student.id}`] || '0'
          );
          return [
            student.id,
            finalGrade,
            escapeCSV(firstName),
            escapeCSV(lastName)
          ];
        });
      })
    );

    const csvData = [
      ['Student ID', 'Final Grade', 'First Name', 'Last Name'].join(','),
      ...allData.map(row => row.join(','))
    ].join('\n');

    // Download merged file
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const assignmentNames = assignmentIds.map(id => assignments[id].name)
      .join('_')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    a.download = `${assignmentNames}_merged.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } else {
    // Create separate files for each assignment-period combination
    assignmentIds.forEach(assignmentId => {
      periodIds.forEach(periodId => {
        exportSingleGradeSet(assignmentId, periodId);
      });
    });
  }
};

const handleAbsenceToggle = async (assignmentId: string, periodId: string, studentId: string) => {
  const key = `${assignmentId}-${periodId}-${studentId}`;
  
  if (absences[key]) {
    // Remove absence
    await supabase
      .from('absences')
      .delete()
      .match({ 
        assignment_id: assignmentId,
        student_id: studentId,
        period: periodId 
      });
  } else {
    // Add absence
    await supabase
      .from('absences')
      .insert({
        assignment_id: assignmentId,
        student_id: studentId,
        period: periodId
      });
  }

  setAbsences(prev => ({
    ...prev,
    [key]: !prev[key]
  }));
};

const handleImportGrades = async (assignmentId: string, periodId: string, grades: Record<string, string>) => {
  const updatedGrades = { ...unsavedGrades };
  
  if (!updatedGrades[assignmentId]) {
    updatedGrades[assignmentId] = {};
  }

  // Get all periods from the assignment
  const assignmentPeriods = assignments[assignmentId].periods;

  // Process each grade entry
  Object.entries(grades).forEach(([localId, score]) => {
    // Look for student in any period
    assignmentPeriods.forEach(period => {
      const studentExists = students[period]?.some(s => s.id === parseInt(localId));
      if (studentExists) {
        if (!updatedGrades[assignmentId][period]) {
          updatedGrades[assignmentId][period] = {};
        }
        updatedGrades[assignmentId][period][parseInt(localId)] = score;
      }
    });
  });

  setUnsavedGrades(updatedGrades);
  assignmentPeriods.forEach(period => {
    setEditingGrades(prev => ({
      ...prev,
      [`${assignmentId}-${period}`]: true
    }));
  });
};

const handleLateToggle = (assignmentId: string, periodId: string, studentId: string) => {
  const key = `${assignmentId}-${periodId}-${studentId}`;
  setLateWork(prev => ({
    ...prev,
    [key]: !prev[key]
  }));
};

const handleIncompleteToggle = (assignmentId: string, periodId: string, studentId: string) => {
  const key = `${assignmentId}-${periodId}-${studentId}`;
  setIncomplete(prev => ({
    ...prev,
    [key]: !prev[key]
  }));
};

const handleExtraPointsChange = (assignmentId: string, periodId: string, studentId: number, points: string) => {
  setExtraPoints(prev => ({
    ...prev,
    [`${assignmentId}-${periodId}-${studentId}`]: points
  }));
};

const calculateTotal = (grade: string = '0', extra: string = '0'): number => {
  const baseGrade = Math.max(0, Math.min(100, parseInt(grade) || 0));
  const extraGrade = Math.max(0, Math.min(100, parseInt(extra) || 0));
  return Math.min(100, baseGrade + extraGrade);
};

const handleRetestToggle = (assignmentId: string, periodId: string, studentId: string) => {
  const key = `${assignmentId}-${periodId}-${studentId}`;
  setRetest(prev => ({
    ...prev,
    [key]: !prev[key]
  }));
};

// Update tag handling functions
const hasTag = (assignmentId: string, periodId: string, studentId: string, tagType: string) => {
  return tags.some(tag => 
    tag.assignment_id === assignmentId && 
    tag.period === periodId && 
    String(tag.student_id) === String(studentId) && 
    tag.tag_type === tagType
  );
};

const handleTagToggle = async (
  assignmentId: string, 
  periodId: string, 
  studentId: number, 
  tagType: 'absent' | 'late' | 'incomplete' | 'retest'
) => {
  // For retest, check if assignment type is Assessment
  if (tagType === 'retest' && assignments[assignmentId]?.type !== 'Assessment') {
    return;
  }

  const existingTag = tags.find(tag => 
    tag.assignment_id === assignmentId && 
    tag.period === periodId && 
    tag.student_id === studentId && 
    tag.tag_type === tagType
  );

  if (existingTag) {
    // Remove tag
    const { error } = await supabase
      .from('assignment_tags')
      .delete()
      .match({ id: existingTag.id });

    if (!error) {
      setTags(prev => prev.filter(tag => tag.id !== existingTag.id));
    }
  } else {
    // Add tag
    const { data, error } = await supabase
      .from('assignment_tags')
      .insert({
        assignment_id: assignmentId,
        student_id: studentId,
        period: periodId,
        tag_type: tagType
      })
      .select()
      .single();

    if (!error && data) {
      setTags(prev => [...prev, data]);
    }
  }
};

const sortStudents = (students: Student[], assignmentId: string, periodId: string) => {
  if (studentSortOrder === 'none') return students;

  return [...students].sort((a, b) => {
    const gradeA = calculateTotal(
      grades[assignmentId]?.[periodId]?.[a.id] || '0',
      extraPoints[`${assignmentId}-${periodId}-${a.id}`] || '0'
    );
    const gradeB = calculateTotal(
      grades[assignmentId]?.[periodId]?.[b.id] || '0',
      extraPoints[`${assignmentId}-${periodId}-${b.id}`] || '0'
    );
    return studentSortOrder === 'highest' ? gradeB - gradeA : gradeA - gradeB;
  });
};

// Add function to handle assignment reordering
const handleDragEnd = (result: DropResult) => {
  console.log('Drag end:', {
    result,
    source: result.source,
    destination: result.destination,
    draggableId: result.draggableId
  });

  if (!result.destination) {
    console.log('No destination, skipping update');
    return;
  }

  const { source, destination } = result;
  const assignmentId = result.draggableId;

  if (groupBy === 'type' && source.droppableId !== destination.droppableId) {
    console.log('Type change:', {
      from: source.droppableId,
      to: destination.droppableId,
      assignmentId
    });
    
    // Change assignment type when dragging between columns
    const newType = destination.droppableId as 'Daily' | 'Assessment';
    handleAssignmentEdit(assignmentId, { type: newType });
  }

  const items = Array.from(assignmentOrder);
  const [reorderedItem] = items.splice(source.index, 1);
  items.splice(destination.index, 0, reorderedItem);
  
  console.log('Updating order:', {
    oldOrder: assignmentOrder,
    newOrder: items,
    reorderedItem
  });
  
  setAssignmentOrder(items);
};

// Add function to edit assignment
const handleAssignmentEdit = async (assignmentId: string, updates: Partial<Assignment>) => {
  try {
    // Convert date to ISO string for Supabase
    const supabaseUpdates = {
      ...updates,
      date: updates.date ? updates.date.toISOString().split('T')[0] : undefined
    };

    const { error } = await supabase
      .from('assignments')
      .update(supabaseUpdates)
      .eq('id', assignmentId);

    if (error) throw error;

    setAssignments(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        ...updates
      }
    }));
  } catch (error) {
    console.error('Error updating assignment:', error);
    alert('Failed to update assignment');
  }
};

// Add function to sort and filter assignments
const getSortedAndFilteredAssignments = () => {
  let entries = assignmentOrder
    .filter(id => assignments[id]) // Filter out any invalid IDs
    .map(id => [id, assignments[id]] as [string, Assignment]);
  
  // Apply Six Weeks filter - only if not 'all'
  if (sixWeeksFilter && sixWeeksFilter !== 'all') {
    entries = entries.filter(([_, assignment]) => {
      // Handle both string and number comparison
      return String(assignment.six_weeks_period) === String(sixWeeksFilter);
    });
  }

  // Apply subject filter - only if not 'all'
  if (subjectFilter && subjectFilter !== 'all') {
    entries = entries.filter(([_, assignment]) => 
      assignment.subject === subjectFilter
    );
  }

  // Apply sorting
  if (dateFilter !== 'none') {
    entries.sort(([, a], [, b]) => {
      if (dateFilter.startsWith('date-')) {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateFilter === 'date-asc' ? dateA - dateB : dateB - dateA;
      } else {
        // Name sorting
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return dateFilter === 'name-asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
    });
  }

  return entries;
};

// Update the assignment card rendering to make editing inline
const getCardColor = (assignment: Assignment) => {
  if (!showColors) return '';
  
  if (colorMode === 'subject') {
    return SUBJECT_COLORS[assignment.subject];
  }
  
  if (colorMode === 'type') {
    return TYPE_COLORS[assignment.type];
  }
  
  return '';
};

// Add these helper functions near the top with other utilities
const formatPeriodName = (period: string) => {
  if (period.match(/^\d+$/)) {
    const num = parseInt(period);
    const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
    return `${num}${suffix} Period`;
  }
  // Handle special cases like "1 SPED"
  const match = period.match(/^(\d+)\s+(.+)$/);
  if (match) {
    const [_, num, label] = match;
    const suffix = num === '1' ? 'st' : num === '2' ? 'nd' : num === '3' ? 'rd' : 'th';
    return `${num}${suffix} Period (${label})`;
  }
  return period;
};

const sortPeriods = (periods: string[]) => {
  return [...periods].sort((a, b) => {
    // Extract numbers from period strings
    const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
    const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
    
    if (aNum === bNum) {
      // If numbers are same, SPED goes after regular period
      return a.includes('SPED') ? 1 : -1;
    }
    return aNum - bNum;
  });
};

const renderAssignmentCard = (assignmentId: string, assignment: Assignment, provided?: any) => (
  <Card 
    className={getCardClassName(
      assignment, 
      expandedAssignments[assignmentId] || editingAssignment === assignmentId,
      colorMode,
      showColors
    )}
    {...(provided ? provided.draggableProps : {})}
    {...(provided ? provided.dragHandleProps : {})}
    ref={provided?.innerRef}
  >
    <CardHeader
      className="flex flex-row items-center justify-between cursor-pointer"
      onClick={() => toggleAssignment(assignmentId)}
    >
      {editingAssignment === assignmentId ? (
        <div className="space-y-2 flex-1" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <Input
              value={assignment.name}
              onChange={(e) => {
                setAssignments(prev => ({
                  ...prev,
                  [assignmentId]: { ...prev[assignmentId], name: e.target.value }
                }));
              }}
              className="flex-1"
            />
            <Button 
              size="sm"
              onClick={() => {
                handleAssignmentEdit(assignmentId, assignments[assignmentId]);
                setEditingAssignment(null);
              }}
            >
              Save
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setEditingAssignment(null)}
            >
              Cancel
            </Button>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {format(assignment.date, 'PPP')} (UTC)
                  <CalendarIcon className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={assignment.date}
                  onSelect={(date) => {
                    if (date) {
                      setAssignments(prev => ({
                        ...prev,
                        [assignmentId]: { ...prev[assignmentId], date }
                      }));
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
            <Select
              value={assignment.subject}
              onValueChange={(value: 'Math 8' | 'Algebra I') => {
                setAssignments(prev => ({
                  ...prev,
                  [assignmentId]: { ...prev[assignmentId], subject: value }
                }));
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Math 8">Math 8</SelectItem>
                <SelectItem value="Algebra I">Algebra I</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={assignment.type}
              onValueChange={(value: 'Daily' | 'Assessment') => {
                setAssignments(prev => ({
                  ...prev,
                  [assignmentId]: { ...prev[assignmentId], type: value }
                }));
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Assessment">Assessment</SelectItem>
              </SelectContent>
            </Select>
            {/* Add period selection */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  {assignment.periods.length} Periods
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" side="bottom">
                <div className="space-y-1 p-2">
                  {Object.keys(students).map(periodId => (
                    <div
                      key={periodId}
                      className="flex items-center space-x-2 rounded hover:bg-accent hover:text-accent-foreground cursor-pointer p-2 text-sm"
                      onClick={() => {
                        const updatedPeriods = assignment.periods.includes(periodId)
                          ? assignment.periods.filter(p => p !== periodId)
                          : [...assignment.periods, periodId];
                        
                        setAssignments(prev => ({
                          ...prev,
                          [assignmentId]: {
                            ...prev[assignmentId],
                            periods: updatedPeriods
                          }
                        }));
                      }}
                    >
                      <Checkbox 
                        checked={assignment.periods.includes(periodId)}
                        className="pointer-events-none h-4 w-4"
                      />
                      <span>{periodId} Period</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4" onClick={() => setEditingAssignment(assignmentId)}>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 p-0 hover:bg-transparent"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={cn(
                  "h-3 w-3 rounded-full",
                  assignment.status === 'completed' ? "bg-green-500" :
                  assignment.status === 'in_progress' ? "bg-blue-500" :
                  assignment.status === 'not_graded' ? "bg-orange-500" :
                  "bg-slate-500"
                )} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1">
              <div className="space-y-1">
                <div 
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                  onClick={() => {
                    handleAssignmentEdit(assignmentId, {
                      ...assignment,
                      status: 'not_started',
                      completed: false,
                      completed_at: null
                    });
                  }}
                >
                  <div className="h-3 w-3 rounded-full bg-slate-500" />
                  <span className="text-sm">Not Started</span>
                </div>
                <div 
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                  onClick={() => {
                    handleAssignmentEdit(assignmentId, {
                      ...assignment,
                      status: 'not_graded',
                      completed: false,
                      completed_at: null
                    });
                  }}
                >
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span className="text-sm">Not Graded</span>
                </div>
                <div 
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                  onClick={() => {
                    handleAssignmentEdit(assignmentId, {
                      ...assignment,
                      status: 'in_progress',
                      completed: false,
                      completed_at: null
                    });
                  }}
                >
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm">In Progress</span>
                </div>
                <div 
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                  onClick={() => {
                    handleAssignmentEdit(assignmentId, {
                      ...assignment,
                      status: 'completed',
                      completed: true,
                      completed_at: new Date()
                    });
                  }}
                >
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Completed</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <div>
            <CardTitle>{assignment.name}</CardTitle>
            <div className="text-sm text-muted-foreground">
              {format(assignment.date, 'PPP')} - {assignment.subject}
              {assignment.status === 'not_graded' && (
                <span className="ml-2 text-orange-500">(Not Yet Graded)</span>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            cloneAssignment(assignmentId);
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <ImportScoresDialog
          assignmentId={assignmentId}
          periodId={activeTab}
          onImport={(grades) => handleImportGrades(assignmentId, activeTab, grades)}
          unsavedGrades={unsavedGrades}
          setUnsavedGrades={setUnsavedGrades}
          setEditingGrades={setEditingGrades}
          assignments={assignments}
          students={students}
          grades={grades}
        />
        <GradeExportDialog
          assignments={{ [assignmentId]: assignment }}
          students={students}
          onExport={(ids, periods, merge) => exportGrades(ids, periods, merge)}
        />
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Delete button clicked for assignment:', assignmentId);
                setDeleteDialog({ isOpen: true, assignmentId, assignmentName: assignment.name });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete assignment</TooltipContent>
        </Tooltip>
        {expandedAssignments[assignmentId] ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </CardHeader>
    {expandedAssignments[assignmentId] && (
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Select
            value={assignment.status || 'not_started'}
            onValueChange={(value: AssignmentStatus) => {
              handleAssignmentEdit(assignmentId, {
                ...assignment,
                status: value,
                completed: value === 'completed',
                completed_at: value === 'completed' ? new Date() : null
              });
            }}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-3 w-3 rounded-full",
                  assignment.status === 'completed' ? "bg-green-500" :
                  assignment.status === 'in_progress' ? "bg-blue-500" :
                  assignment.status === 'not_graded' ? "bg-orange-500" :
                  "bg-slate-500"
                )} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="not_graded">Not Graded</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            {assignment.google_classroom_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncGradesToClassroom(assignmentId, activeTab)}
                disabled={syncingAssignments[assignmentId]}
              >
                <RefreshCw className={cn(
                  "h-4 w-4 mr-2",
                  syncingAssignments[assignmentId] && "animate-spin"
                )} />
                {syncingAssignments[assignmentId] ? 'Syncing...' : 'Sync to Classroom'}
              </Button>
            )}
          </div>
        </div>

        <Tabs 
          defaultValue={activeTab || assignment.periods[0]} 
          onValueChange={setActiveTab}
          value={activeTab || assignment.periods[0]} // Add this line
        >
          <TabsList className="w-full">
            {sortPeriods(assignment.periods).map(periodId => (
              <TabsTrigger
                key={periodId}
                value={periodId}
                className="flex-1"
              >
                {formatPeriodName(periodId)}
              </TabsTrigger>
            ))}
          </TabsList>

          {assignment.periods.map(periodId => (
            <TabsContent key={periodId} value={periodId}>
  <div className="space-y-4">
    <PeriodStudentSearch 
      students={Object.values(students).flat()}
      assignmentId={assignmentId}
      onSelect={(studentId, periodId) => {
        const tabTrigger = document.querySelector(`[value="${periodId}"]`) as HTMLButtonElement;
        if (tabTrigger) tabTrigger.click();
        
        setTimeout(() => {
          const gradeInput = document.querySelector(
            `input[id="grade-${assignmentId}-${periodId}-${studentId}"]`
          ) as HTMLInputElement;
          if (gradeInput) {
            gradeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            gradeInput.focus();
          }
        }, 100);
      }}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
    
    <div className="flex justify-between items-center">
      <Select
        value={studentSortOrder}
        onValueChange={(value: 'none' | 'highest' | 'lowest') => setStudentSortOrder(value)}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Sort</SelectItem>
          <SelectItem value="highest">Highest</SelectItem>
          <SelectItem value="lowest">Lowest</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Grid headers with matching column widths */}
    <div className="grid grid-cols-[minmax(200px,1fr)_100px_100px_100px_140px] gap-x-4 px-4 py-1 bg-muted text-sm font-medium">
      <div className="flex items-center">Student ID & Name</div>
      <div className="flex items-center justify-center">Initial Grade</div>
      <div className="flex items-center justify-center">Extra Points</div>
      <div className="flex items-center justify-center">Total Grade</div>
      <div className="flex items-center justify-center">Tags</div>
    </div>
                <div className="divide-y divide-border">
                  {sortStudents(students[periodId] || [], assignmentId, periodId).map(student => (
                    <div 
                      key={student.id} 
                      className={cn(
                        "grid grid-cols-[minmax(200px,1fr)_100px_100px_100px_140px] items-center h-8 gap-x-4 px-4",
                        activeRow === `${assignmentId}-${periodId}-${student.id}` && "bg-muted"  // Changed to bg-muted like RosterView
                      )}
                    >
                      <div className="flex items-center px-2"> {/* Simplified student name cell */}
                        <span className="text-sm text-muted-foreground mr-2">
                          {student.id}
                        </span>
                        <span className="text-sm">{student.name}</span>
                      </div>
                      
                      <Input
                        id={`grade-${assignmentId}-${periodId}-${student.id}`}
                        type="text"
                        placeholder="0"
                        className="text-center h-8 border-0 focus:ring-1" // Added border-0 and focus:ring-1 like RosterView
                        value={getGradeValue(assignmentId, periodId, String(student.id))}
                        onChange={(e) => handleGradeChange(assignmentId, periodId, String(student.id), e.target.value)}
                        onFocus={() => setActiveRow(`${assignmentId}-${periodId}-${student.id}`)}
                        onBlur={() => {
                          setActiveRow(null);
                          // Save on blur if we have local changes
                          if (localGrades[`${assignmentId}-${periodId}-${student.id}`]) {
                            debouncedSaveGrades(assignmentId);
                          }
                        }}
                        onKeyDown={(e) => handleGradeInputKeyDown(
                          e,
                          assignmentId,
                          periodId,
                          String(student.id),
                          students[periodId] || []
                        )}
                      />
                      
                      <Input
                        type="text"
                        placeholder="+0"
                        className="text-center h-8 border-0 focus:ring-1" // Added border-0 and focus:ring-1 like RosterView
                        value={extraPoints[`${assignmentId}-${periodId}-${student.id}`] || ''}
                        onChange={(e) => {
                          handleExtraPointsChange(assignmentId, periodId, student.id, e.target.value);
                          if (e.target.value !== '') {
                            debouncedSaveGrades(assignmentId);
                          }
                        }}
                      />
                      
                      <div className="flex items-center justify-center h-8 px-2">
                        <span className="text-sm font-medium">
                          {calculateTotal(
                            editingGrades[`${assignmentId}-${periodId}`]
                              ? unsavedGrades[assignmentId]?.[periodId]?.[student.id]
                              : grades[assignmentId]?.[periodId]?.[student.id],
                            extraPoints[`${assignmentId}-${periodId}-${student.id}`]
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 justify-end px-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-1.5 h-5 text-xs" // Changed px-2 to px-1.5
                          onClick={() => handleTagToggle(assignmentId, periodId, student.id, 'absent')}
                          className={cn(
                            "px-2 h-5 text-xs", // Changed h-6 to h-5
                            hasTag(assignmentId, periodId, String(student.id), 'absent') && "bg-red-100"
                          )}
                        >
                          Abs
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-1.5 h-5 text-xs" // Changed px-2 to px-1.5
                          onClick={() => handleTagToggle(assignmentId, periodId, student.id, 'late')}
                          className={cn(
                            "px-2 h-5 text-xs", // Changed h-6 to h-5
                            hasTag(assignmentId, periodId, String(student.id), 'late') && "bg-yellow-100"
                          )}
                        >
                          Late
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-1.5 h-5 text-xs" // Changed px-2 to px-1.5
                          onClick={() => handleTagToggle(assignmentId, periodId, student.id, 'incomplete')}
                          className={cn(
                            "px-2 h-5 text-xs", // Changed h-6 to h-5
                            hasTag(assignmentId, periodId, String(student.id), 'incomplete') && "bg-orange-100"
                          )}
                        >
                          Inc
                        </Button>
                        {assignment.type === 'Assessment' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-1.5 h-5 text-xs" // Changed px-2 to px-1.5
                            onClick={() => handleTagToggle(assignmentId, periodId, student.id, 'retest')}
                            className={cn(
                              "px-2 h-5 text-xs", // Changed h-6 to h-5
                              hasTag(assignmentId, periodId, String(student.id), 'retest') && "bg-blue-100"
                            )}
                          >
                            Retest
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Autofill row positioned below students */}
                <div className="grid grid-cols-[minmax(200px,1fr)_100px_100px_100px_140px] items-center h-8 gap-x-4 px-4">
                  <div></div> {/* Empty first column */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder=""
                      className="text-center h-8 w-16"
                      value={autofillValue}
                      onChange={(e) => setAutofillValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && autofillValue) {
                          const updatedGrades = { ...unsavedGrades };
                          if (!updatedGrades[assignmentId]) {
                            updatedGrades[assignmentId] = {};
                          }
                          if (!updatedGrades[assignmentId][periodId]) {
                            updatedGrades[assignmentId][periodId] = {};
                          }
                          students[periodId].forEach(student => {
                            const key = `${assignmentId}-${periodId}-${student.id}`;
                            if (!grades[assignmentId]?.[periodId]?.[student.id]) {
                              updatedGrades[assignmentId][periodId][student.id] = autofillValue;
                              setLocalGrades(prev => ({
                                ...prev,
                                [key]: autofillValue
                              }));
                            }
                          });
                          setUnsavedGrades(updatedGrades);
                          setEditingGrades(prev => ({
                            ...prev,
                            [`${assignmentId}-${periodId}`]: true
                          }));
                          debouncedSaveGrades(assignmentId);
                          setAutofillValue('');
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (autofillValue) {
                          const updatedGrades = { ...unsavedGrades };
                          if (!updatedGrades[assignmentId]) {
                            updatedGrades[assignmentId] = {};
                          }
                          if (!updatedGrades[assignmentId][periodId]) {
                            updatedGrades[assignmentId][periodId] = {};
                          }
                          students[periodId].forEach(student => {
                            const key = `${assignmentId}-${periodId}-${student.id}`;
                            if (!grades[assignmentId]?.[periodId]?.[student.id]) {
                              updatedGrades[assignmentId][periodId][student.id] = autofillValue;
                              setLocalGrades(prev => ({
                                ...prev,
                                [key]: autofillValue
                              }));
                            }
                          });
                          setUnsavedGrades(updatedGrades);
                          setEditingGrades(prev => ({
                            ...prev,
                            [`${assignmentId}-${periodId}`]: true
                          }));
                          debouncedSaveGrades(assignmentId);
                          setAutofillValue('');
                        }
                      }}
                    >
                      Fill
                    </Button>
                  </div>
                  <div></div> {/* Empty columns */}
                  <div></div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                {assignment.google_classroom_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncGradesToClassroom(assignmentId, periodId)}
                    disabled={syncingAssignments[assignmentId]}
                    className="ml-2"
                  >
                    <RefreshCw className={cn(
                      "h-4 w-4 mr-2",
                      syncingAssignments[assignmentId] && "animate-spin"
                    )} />
                    {syncingAssignments[assignmentId] ? 'Syncing...' : 'Sync to Classroom'}
                  </Button>
                )}
                <Button
                  onClick={() => saveGrades(assignmentId)}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save All Grades
                </Button>
                {assignment.google_classroom_id && ( // Only show if assignment is linked
                  <Button 
                    onClick={() => handleSyncGrades(assignmentId)}
                    variant="outline"
                    className="ml-2"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync to Classroom
                  </Button>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    )}
  </Card>
);

// Add CSV escape utility function
const escapeCSV = (value: string) => {
  if (value.includes(',') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

// Add function to get grouped assignments
const getGroupedAssignments = () => {
  const entries = getSortedAndFilteredAssignments();
    
  if (groupBy === 'type') {
    const daily = entries.filter(([_, assignment]) => assignment.type === 'Daily');
    const assessment = entries.filter(([_, assignment]) => assignment.type === 'Assessment');
      
    // Only include groups that have assignments
    const result: Record<string, [string, Assignment][]> = {};
    if (daily.length > 0) result.Daily = daily;
    if (assessment.length > 0) result.Assessment = assessment;
      
    return result;
  }

  // Return empty object if no assignments match filters
  if (entries.length === 0) return {};
    
  return { all: entries };
};

// Update renderAssignmentsSection to handle expanded cards in grouped view
const renderAssignmentsSection = () => {
  const grouped = getGroupedAssignments();
  console.log('Rendering assignments section:', {
    groupBy,
    assignmentCount: Object.keys(assignments).length,
    grouped,
    activeTab,
  });

  if (groupBy === 'type') {
    return (
      <div className="relative grid grid-cols-2 gap-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Daily Assignments Column */}
          <div className="space-y-4">
            <h3 className="font-semibold">Daily Work</h3>
            <Droppable droppableId="Daily" isDropDisabled={false}>
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className="relative grid grid-cols-1 gap-4"
                >
                  {(grouped.Daily || []).map(([id, assignment], index) => (
                    <Draggable key={id} draggableId={id} index={index}>
                      {(provided) => renderAssignmentCard(id, assignment, provided)}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Assessment Column */}
          <div className="space-y-4">
            <h3 className="font-semibold">Assessments</h3>
            <Droppable droppableId="Assessment" isDropDisabled={false}>
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className="relative grid grid-cols-1 gap-4"
                >
                  {(grouped.Assessment || []).map(([id, assignment], index) => (
                    <Draggable key={id} draggableId={id} index={index}>
                      {(provided) => renderAssignmentCard(id, assignment, provided)}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      </div>
    );
  }

  // Default two-column view remains unchanged
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="assignments" isDropDisabled={false}>
        {(provided) => (
          <div 
            {...provided.droppableProps} 
            ref={provided.innerRef}
            className="grid grid-cols-2 gap-4 auto-rows-min"
          >
            {(grouped.all || []).map(([id, assignment], index) => (
              <Draggable key={id} draggableId={id} index={index}>
                {(provided) => renderAssignmentCard(id, assignment, provided)}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

const handleRemoveTag = async (tag: AssignmentTag): Promise<void> => {
  try {
    const { error } = await supabase
      .from('assignment_tags')
      .delete()
      .match({ id: tag.id });

    if (error) {
      throw error;
    }

    // Update local state by removing the tag
    setTags(prev => prev.filter(t => t.id !== tag.id));
  } catch (error) {
    console.error('Error removing tag:', error);
    alert('Failed to remove tag');
  }
};

// Update the toggleAssignment function to manage activeTab
const toggleAssignment = (assignmentId: string) => {
  setExpandedAssignments(prev => {
    const willExpand = !prev[assignmentId];
    
    // If we're expanding and there's no active tab, set it to the first period
    if (willExpand && !activeTab) {
      const firstPeriod = assignments[assignmentId]?.periods[0];
      console.log('Setting initial period:', {
        assignmentId,
        firstPeriod,
        periods: assignments[assignmentId]?.periods
      });
      if (firstPeriod) {
        setActiveTab(firstPeriod);
      }
    }
    
    return {
      ...prev,
      [assignmentId]: willExpand
    };
  });
};

const syncGradesToClassroom = async (assignmentId: string, periodId: string) => {
  try {
    setSyncingAssignments(prev => ({ ...prev, [assignmentId]: true }));

    // Debug student data before sync
    console.log('Debug student data:', {
      periodStudents: students[periodId]?.map(s => ({
        id: s.id,
        name: s.name,
        googleId: s.google_id,
        hasGoogleId: !!s.google_id
      }))
    });

    const [courseId, courseWorkId] = assignments[assignmentId]?.google_classroom_id?.split('_') || [];
    
    if (!courseId || !courseWorkId) {
      throw new Error('Assignment not properly linked to Google Classroom');
    }

    const periodStudents = students[periodId] || [];
    const periodGrades = grades[assignmentId]?.[periodId] || {};

    // Map student grades using Google IDs
    const gradesToSync = periodStudents
      .filter(student => {
        const hasGrade = !!periodGrades[student.id];
        const hasGoogleId = !!student.google_id;
        
        if (!hasGoogleId) {
          console.log('Student missing Google ID:', {
            studentId: student.id,
            name: student.name
          });
        }
        
        return hasGrade && hasGoogleId;
      })
      .map(student => ({
        studentId: student.google_id!, // Use Google ID here
        grade: calculateTotal(
          periodGrades[student.id],
          extraPoints[`${assignmentId}-${periodId}-${student.id}`] || '0'
        )
      }));

    console.log('Prepared grades for sync:', {
      totalStudents: periodStudents.length,
      studentsWithGrades: Object.keys(periodGrades).length,
      studentsWithGoogleIds: periodStudents.filter(s => !!s.google_id).length,
      gradesToSync: gradesToSync.length
    });

    if (gradesToSync.length === 0) {
      throw new Error('No students found with both grades and Google IDs');
    }

    const response = await fetch(
      `/api/classroom/${courseId}/assignments/${courseWorkId}/grades`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify({ grades: gradesToSync })
      }
    );

    // ...rest of the function remains the same...
  } catch (error) {
    // ...error handling remains the same...
  }
};

// Update handleSyncGrades to ensure we have an active period
const handleSyncGrades = async (assignmentId: string) => {
  try {
    if (!session?.accessToken) {
      toast({ title: "Error", description: "Not authenticated" });
      return;
    }

    const assignment = assignments[assignmentId];
    if (!assignment) {
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: "Assignment not found" 
      });
      return;
    }

    // If no active tab, use first period from assignment
    const periodId = activeTab || assignment.periods[0];
    if (!periodId) {
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: "No period available for sync" 
      });
      return;
    }

    // Debug info
    console.log('Sync initiated:', {
      assignmentId,
      periodId,
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      assignment,
      periodStudents: students[periodId]?.length || 0,
    });

    setSyncingAssignments(prev => ({ ...prev, [assignmentId]: true }));

    const grades = await getGradesForSync({
      assignmentId,
      periodId
    });

    // ... rest of sync function ...
    // ...existing code...
  } catch (error) {
    // ... existing error handling ...
  } finally {
    setSyncingAssignments(prev => ({ ...prev, [assignmentId]: false }));
  }
};

// Function to get the first available period
const getDefaultPeriod = () => {
  const periods = Object.keys(students).sort();
  return periods[0] || '';
};

// Update the view mode handler to set default period
const handleViewModeChange = (mode: 'assignment' | 'roster') => {
  setViewMode(mode);
  if (mode === 'roster' && !activeTab) {
    setActiveTab(getDefaultPeriod());
  }
};

// Add weighted average calculation helper
const calculateWeightedAverage = (grades: number[], types: ('Daily' | 'Assessment')[]) => {
  if (grades.length === 0) return 0;
  
  const dailyGrades = grades.filter((_, i) => types[i] === 'Daily');
  const assessmentGrades = grades.filter((_, i) => types[i] === 'Assessment');
  
  const dailyAvg = dailyGrades.length > 0 
    ? dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length 
    : 0;
  
  const assessmentAvg = assessmentGrades.length > 0 
    ? assessmentGrades.reduce((a, b) => a + b, 0) / assessmentGrades.length 
    : 0;
  
  return Math.round((dailyAvg * 0.8) + (assessmentAvg * 0.2));
};

const cloneAssignment = async (assignmentId: string) => {
  try {
    const sourceAssignment = assignments[assignmentId];
    if (!sourceAssignment) return;

    // Log starting state for debugging
    console.log('Starting clone operation:', {
      sourceAssignmentId: assignmentId,
      sourceAssignment,
      sourceGrades: grades[assignmentId],
      sourceExtraPoints: Object.entries(extraPoints)
        .filter(([key]) => key.startsWith(`${assignmentId}-`))
        .reduce((acc, [key, value]) => ({...acc, [key]: value}), {})
    });

    const newAssignmentId = crypto.randomUUID();

    // Create new assignment data, preserving all important fields
    const newAssignmentData = {
      id: newAssignmentId,
      name: `${sourceAssignment.name} (Copy)`,
      date: new Date(), // Use current date for the copy
      type: sourceAssignment.type,
      periods: [...sourceAssignment.periods], // Make sure to create a new array
      subject: sourceAssignment.subject,
      six_weeks_period: sourceAssignment.six_weeks_period, // Critical: preserve six weeks period
      status: sourceAssignment.status || 'not_started',
      max_points: sourceAssignment.max_points || 100,
      created_at: new Date().toISOString()
    };

    console.log('Prepared new assignment data:', newAssignmentData);

    // Insert new assignment
    const { data: insertedAssignment, error: assignmentError } = await supabase
      .from('assignments')
      .insert([newAssignmentData])
      .select()
      .single();

    if (assignmentError) throw assignmentError;

    console.log('Assignment inserted in database:', insertedAssignment);

    // Clone grades
    const sourceGrades = grades[assignmentId] || {};
    const gradesToClone = [];
    
    // Explicitly build grade objects for each period and student
    for (const periodId of sourceAssignment.periods) {
      const periodGrades = sourceGrades[periodId] || {};
      
      for (const [studentId, grade] of Object.entries(periodGrades)) {
        // Skip empty grades
        if (!grade || grade === '0') continue;
        
        // Get extra points if any
        const extraPointsKey = `${assignmentId}-${periodId}-${studentId}`;
        const extraPointsValue = extraPoints[extraPointsKey] || '0';
        
        gradesToClone.push({
          assignment_id: newAssignmentId,
          student_id: studentId,
          period: periodId,
          grade: String(grade), // Ensure it's a string
          extra_points: extraPointsValue
        });
      }
    }

    console.log(`Prepared ${gradesToClone.length} grades to clone:`, gradesToClone);

    if (gradesToClone.length > 0) {
      const { data: insertedGrades, error: gradesError } = await supabase
        .from('grades')
        .insert(gradesToClone)
        .select();

      if (gradesError) throw gradesError;

      console.log('Grades inserted in database:', insertedGrades);
      
      // Update local state - for both grades and extra points
      const newGradesState = {...grades};
      const newExtraPointsState = {...extraPoints};

      // Initialize nested structure for the new assignment
      if (!newGradesState[newAssignmentId]) {
        newGradesState[newAssignmentId] = {};
      }

      // Populate the grades
      gradesToClone.forEach(({ assignment_id, period, student_id, grade, extra_points }) => {
        // Make sure the period object exists
        if (!newGradesState[assignment_id][period]) {
          newGradesState[assignment_id][period] = {};
        }
        
        // Set the grade
        newGradesState[assignment_id][period][student_id] = grade;
        
        // Set extra points if needed
        if (extra_points && extra_points !== '0') {
          const newKey = `${assignment_id}-${period}-${student_id}`;
          newExtraPointsState[newKey] = extra_points;
        }
      });

      // Update state with our carefully constructed objects
      setGrades(newGradesState);
      setExtraPoints(newExtraPointsState);
      
      console.log('Updated local state with new grades:', {
        updatedGrades: newGradesState[newAssignmentId],
        extraPointsUpdated: Object.keys(newExtraPointsState).filter(k => k.startsWith(newAssignmentId)).length
      });
    }

    // Update local assignment state
    setAssignments(prev => ({
      ...prev,
      [newAssignmentId]: {
        ...newAssignmentData,
        date: new Date() // Ensure date is a Date object
      }
    }));

    // Add to assignment order at the top - also check if we need to handle filters
    setAssignmentOrder(prev => {
      const updatedOrder = [newAssignmentId, ...prev];
      console.log('Updated assignment order:', {
        previousLength: prev.length,
        newLength: updatedOrder.length,
        firstFewIds: updatedOrder.slice(0, 3)
      });
      return updatedOrder;
    });

    // Check if the assignment might be filtered out
    const mightBeFiltered = 
      (sixWeeksFilter && sixWeeksFilter !== 'all' && newAssignmentData.six_weeks_period !== sixWeeksFilter) ||
      (subjectFilter !== 'all' && newAssignmentData.subject !== subjectFilter);
    
    if (mightBeFiltered) {
      toast({
        title: "Assignment Copied",
        description: `Note: The copied assignment may be hidden due to active filters. Check your filter settings if you don't see it.`,
        variant: "default"
      });
    } else {
      toast({
        title: "Success",
        description: `Assignment cloned with ${gradesToClone.length} grades`
      });
    }

  } catch (error) {
    console.error('Error cloning assignment:', error);
    toast({
      variant: "destructive",
      title: "Error", 
      description: error instanceof Error ? error.message : "Failed to clone assignment"
    });
  }
};

useEffect(() => {
  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data);
  };

  loadMessages();
}, []);

// Add message handlers
const handleMessageCreate = async (
  studentId: number, 
  assignmentId: string, 
  message: string, 
  type: 'grade_question' | 'general'
) => {
  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, assignmentId, message, type })
    });

    if (!response.ok) throw new Error('Failed to create message');
    
    const newMessage = await response.json();
    setMessages(prev => [newMessage, ...prev]);

    toast({
      title: "Message Sent",
      description: "Your message has been sent to the teacher."
    });
  } catch (error) {
    console.error('Error creating message:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to send message. Please try again."
    });
  }
};

const handleMessageResolve = async (messageId: string) => {
  try {
    const response = await fetch('/api/messages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, status: 'resolved' })
    });

    if (!response.ok) throw new Error('Failed to resolve message');
    
    const updatedMessage = await response.json();
    setMessages(prev => prev.map(m => 
      m.id === messageId ? updatedMessage : m
    ));

    toast({
      title: "Message Resolved",
      description: "Message has been marked as resolved."
    });
  } catch (error) {
    console.error('Error resolving message:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to resolve message. Please try again."
    });
  }
};

// Add subscription setup
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
        console.log('Message update:', payload);
        
        switch (payload.eventType) {
          case 'INSERT':
            setMessages(prev => [payload.new as Message, ...prev]);
            // Show toast for new messages
            if (payload.new.status === 'unread') {
              toast({
                title: "New Message",
                description: "You have a new message from a student"
              });
            }
            break;
          
          case 'UPDATE':
            setMessages(prev => 
              prev.map(msg => 
                msg.id === payload.new.id ? (payload.new as Message) : msg
              )
            );
            break;
          
          case 'DELETE':
            setMessages(prev => 
              prev.filter(msg => msg.id !== payload.old.id)
            );
            break;
        }
      }
    )
    .subscribe();

  setMessageSubscription(subscription);

  return () => {
    subscription.unsubscribe();
  };
}, []);

// Add handler for resolving flags
const handleResolveFlag = async (flagId: string) => {
  try {
    const { error } = await supabase
      .from('assignment_flags')
      .update({ reviewed_at: new Date().toISOString() })
      .eq('id', flagId);

    if (error) throw error;

    setFlags(prev => prev.map(flag => 
      flag.id === flagId 
        ? { ...flag, reviewed_at: new Date().toISOString() }
        : flag
    ));

    toast({
      title: "Flag Resolved",
      description: "Assignment has been marked as reviewed"
    });
  } catch (error) {
    console.error('Error resolving flag:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: "Couldn't resolve flag"
    });
  }
};

// Add this in your useEffect for initial data loading
useEffect(() => {
  const loadFlags = async () => {
    const { data, error } = await supabase
      .from('assignment_flags')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading flags:', error);
      return;
    }
    setFlags(data);
  };

  loadFlags();
}, []);

return (
  <div className="p-2 sm:p-4 lg:p-6">
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4">
      <h1 className="text-xl sm:text-2xl font-bold">Gradebook</h1>
      <div className="flex items-center gap-2 sm:gap-4">
        <FlagInbox 
          flags={flags}
          students={students}
          assignments={assignments}
          onResolve={handleResolveFlag}
        />
        {/* Default light variant will be used */}
        <SignOutButton />
      </div>
    </div>
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Main content - now with full width when calendar is hidden */}
      <div className="flex-grow space-y-4 w-full">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <CreateAssignmentDialog 
              activeTab={activeTab}
              students={students}
              onAssignmentCreated={(newAssignment) => {
                setAssignments(prev => ({
                  ...prev,
                  [newAssignment.id]: newAssignment
                }));
                setAssignmentOrder(prev => [...prev, newAssignment.id]);
              }}
            />
            
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  <FileUp className="h-4 w-4" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <BulkImportDialog
                onImport={(importedAssignments) => {
                  // Process imported assignments
                  // ...existing implementation...
                }}
                studentIds={Object.values(students).flat().map(s => s.id.toString())}
                availablePeriods={Object.keys(students)}
                activeTab={activeTab}
                existingAssignments={assignments}
                setAssignments={setAssignments}
                students={students}
              />
            </Dialog>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleViewModeChange('assignment')}
              className={cn(viewMode === 'assignment' && "bg-secondary")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleViewModeChange('roster')}
              className={cn(viewMode === 'roster' && "bg-secondary")}
            >
              <Table className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode('calendar')}
              className={cn(viewMode === 'calendar' && "bg-secondary")}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* View Mode Content */}
        {viewMode === 'calendar' ? (
          <CalendarView 
            assignments={assignments}
            students={students}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            activeTab={activeTab}
            toggleAssignment={toggleAssignment}
            sixWeeksFilter={sixWeeksFilter}
            setSixWeeksFilter={setSixWeeksFilter}
          />
        ) : viewMode === 'assignment' ? (
          // Your existing assignment view content
          <>
            {newAssignment && (
              <Card>
                <CardHeader>
                  <CardTitle>New Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input 
                    placeholder="Assignment Name"
                    value={newAssignment?.name || ''}
                    onChange={(e) => handleAssignmentNameChange(e.target.value)}
                  />
                  
                  {/* Dropdowns row */}
                  <div className="flex gap-2">
                    <Select 
                      value={selectedType}
                      onValueChange={(value: 'Daily' | 'Assessment') => setSelectedType(value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Assessment">Assessment</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={newAssignment.subject}
                      onValueChange={(value: 'Math 8' | 'Algebra I') => 
                        setNewAssignment(prev => prev ? { ...prev, subject: value } : null)
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Math 8">Math 8</SelectItem>
                        <SelectItem value="Algebra I">Algebra I</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="w-[140px] relative">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-between text-sm font-normal h-9"
                            role="combobox"
                          >
                            {newAssignment.periods.length 
                              ? `${newAssignment.periods.length} selected` 
                              : "Select periods"}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" side="bottom">
                          <div className="space-y-1 p-2">
                            {Object.keys(students).map(periodId => (
                              <div
                                key={periodId}
                                className="flex items-center space-x-2 rounded hover:bg-accent hover:text-accent-foreground cursor-pointer p-2 text-sm"
                                onClick={() => {
                                  const isSelected = newAssignment.periods.includes(periodId);
                                  setNewAssignment(prev => prev ? {
                                    ...prev,
                                    periods: isSelected 
                                      ? prev.periods.filter(p => p !== periodId)
                                      : [...prev.periods, periodId]
                                  } : null);
                                }}
                              >
                                <Checkbox 
                                  checked={newAssignment.periods.includes(periodId)}
                                  className="pointer-events-none h-4 w-4"
                                />
                                <span>Period {periodId}</span>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(newAssignment.date, 'PP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newAssignment.date}
                          onSelect={(date) => {
                            if (date) {
                              // Create a new date at UTC midnight to avoid timezone issues
                              const utcDate = new Date(Date.UTC(
                                date.getFullYear(),
                                date.getMonth(),
                                date.getDate()
                              ));
                              setNewAssignment(prev => prev ? { ...prev, date: utcDate } : null);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button onClick={saveAssignment} className="w-full">
                    Create Assignment
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="flex gap-4 mb-4">
              <SixWeeksSelector
                value={sixWeeksFilter}
                onChange={setSixWeeksFilter}
              />
              <Select
                value={subjectFilter}
                onValueChange={(value: 'all' | 'Math 8' | 'Algebra I') => setSubjectFilter(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="Math 8">Math 8</SelectItem>
                  <SelectItem value="Algebra I">Algebra I</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={dateFilter}
                onValueChange={(value: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'none') => setDateFilter(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manual Sort</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                  <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
              <BulkActionsDialog 
                assignments={assignments}
                onDelete={bulkDeleteAssignments}
              />
            </div>
            {Object.keys(getGroupedAssignments()).length > 0 ? (
              renderAssignmentsSection()
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-muted-foreground text-center">
                  <p className="text-lg font-medium">No assignments found</p>
                  <p className="text-sm mt-2">
                    {sixWeeksFilter !== 'all' && `Six Weeks: ${sixWeeksFilter}`}
                    {sixWeeksFilter !== 'all' && subjectFilter !== 'all' && ' • '}
                    {subjectFilter !== 'all' && `Subject: ${subjectFilter}`}
                  </p>
                  <p className="text-sm mt-2">
                    Try adjusting your filters or create a new assignment
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          // New Roster View
          <div className="mt-4">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList>
                {Object.keys(students).sort().map(periodId => (
                  <TabsTrigger
                    key={periodId}
                    value={periodId}
                  >
                    Period {periodId}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={activeTab} className="mt-4">
                <RosterView
                  students={students}
                  sixWeeksFilter={sixWeeksFilter}
                  setSixWeeksFilter={setSixWeeksFilter}
                  setStudents={setStudents}
                  deactivateStudent={deactivateStudent}
                  assignments={assignments}
                  grades={grades}
                  onGradeChange={handleGradeChange}
                  getGradeValue={getGradeValue}
                  calculateTotal={calculateTotal}
                  activeTab={activeTab}
                  unsavedGrades={unsavedGrades}
                  setUnsavedGrades={setUnsavedGrades}
                  setEditingGrades={setEditingGrades}
                  handleImportGrades={handleImportGrades}
                  exportGrades={exportGrades}
                  saveGrades={async (assignmentId: string) => {
                    try {
                      await saveGrades(assignmentId);
                      return true;
                    } catch (error) {
                      console.error('Error saving grades:', error);
                      return false;
                    }
                  }}
                  extraPoints={extraPoints}
                  editingGrades={editingGrades}
                  onExtraPointsChange={handleExtraPointsChange}
                  messages={messages}
                  onMessageResolve={handleMessageResolve}
                  onMessageCreate={handleMessageCreate}
                  sixWeeksFilter={sixWeeksFilter}
                  setSixWeeksFilter={setSixWeeksFilter}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

    </div>
    <DeleteConfirmationDialog
      isOpen={deleteDialog.isOpen}
      assignmentId={deleteDialog.assignmentId}
      assignmentName={deleteDialog.assignmentName}
      onConfirm={() => {
        deleteAssignment(deleteDialog.assignmentId);
        setDeleteDialog({ isOpen: false, assignmentId: '', assignmentName: '' });
      }}
      onCancel={() => setDeleteDialog({ isOpen: false, assignmentId: '', assignmentName: '' })}
    />
  </div>
);
};

export default GradeBook;

// Add this component to the existing components at the top
const DeleteConfirmationDialog: FC<{
  isOpen: boolean;
  assignmentId: string;
  assignmentName: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, assignmentId, assignmentName, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Assignment</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>Are you sure you want to delete <strong>{assignmentName}</strong>?</p>
          <p className="text-sm text-muted-foreground mt-2">This will permanently delete all grades and data associated with this assignment.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Add this utility function at the top level with other utility functions
const arraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
};

// Add this new function to handle keyboard navigation between student grade inputs
const handleGradeInputKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>,
  assignmentId: string,
  periodId: string,
  currentStudentId: string,
  students: Student[]
) => {
  // If Arrow Down key is pressed
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    
    // Find the current student's index in the array
    const currentIndex = students.findIndex(s => String(s.id) === currentStudentId);
    
    // If there's a next student, focus on their grade input
    if (currentIndex < students.length - 1) {
      const nextStudent = students[currentIndex + 1];
      const nextInputId = `grade-${assignmentId}-${periodId}-${nextStudent.id}`;
      
      setTimeout(() => {
        const nextInput = document.getElementById(nextInputId) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
          nextInput.select(); // Select the text for easy replacement
        }
      }, 0);
    }
  }
  // If Arrow Up key is pressed
  else if (e.key === 'ArrowUp') {
    e.preventDefault();
    
    // Find the current student's index in the array
    const currentIndex = students.findIndex(s => String(s.id) === currentStudentId);
    
    // If there's a previous student, focus on their grade input
    if (currentIndex > 0) {
      const prevStudent = students[currentIndex - 1];
      const prevInputId = `grade-${assignmentId}-${periodId}-${prevStudent.id}`;
      
      setTimeout(() => {
        const prevInput = document.getElementById(prevInputId) as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
          prevInput.select(); // Select the text for easy replacement
        }
      }, 0);
    }
  }
};

// Add GradeAutofill component definition after the other component definitions
const GradeAutofill: FC<{
  assignmentId: string;
  periodId: string;
  students: Student[];
  onAutofill: (assignmentId: string, periodId: string, value: string) => void;
}> = ({ assignmentId, periodId, students, onAutofill }) => {
  const [autofillValue, setAutofillValue] = useState('');
  
  return (
    <div className="grid grid-cols-[1fr_100px_100px_100px_auto] items-center h-8 border-t border-muted">
      <div className="flex items-center px-2 justify-end">
        <span className="text-sm text-muted-foreground mr-2">Autofill empty grades:</span>
      </div>
      <Input
        type="text"
        placeholder="Grade"
        className="text-center h-8 border-0 focus:ring-1"
        value={autofillValue}
        onChange={(e) => setAutofillValue(e.target.value)}
      />
      <div></div>
      <div></div>
      <div className="flex items-center justify-end px-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (autofillValue && autofillValue.trim() !== '') {
              onAutofill(assignmentId, periodId, autofillValue);
              setAutofillValue(''); // Clear the input after filling
            }
          }}
        >
          Fill
        </Button>
      </div>
    </div>
  );
};

