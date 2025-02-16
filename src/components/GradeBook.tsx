'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Save, ChevronDown, ChevronUp, Download, ChevronLeft, ChevronRight, PlusCircle, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { startOfWeek, addDays, isSameDay, format } from 'date-fns';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
import CustomWeekView from './WeekView'; // Update import name to avoid confusion
import { Assignment, Student, AssignmentTag, GradeData } from '@/types/gradebook';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { v4 as uuidv4 } from 'uuid';  // Add this import at the top
import { useSession } from 'next-auth/react';
import { getGradesForSync } from '@/lib/gradeSync';

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

const GradeExportDialog: FC<ExportDialogProps> = ({ assignments, students, onExport }) => {
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [mergePeriods, setMergePeriods] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
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

// Fix the ImportScoresDialog component
const ImportScoresDialog: FC<{
  assignmentId: string;
  periodId: string;
  onImport: (grades: Record<string, string>) => void;
  unsavedGrades: GradeData;
  setUnsavedGrades: React.Dispatch<React.SetStateAction<GradeData>>;
  setEditingGrades: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  assignments: Record<string, Assignment>;
  students: Record<string, Student[]>;
  grades: GradeData;
}> = ({ assignmentId, periodId, onImport, unsavedGrades, setUnsavedGrades, setEditingGrades, assignments, students, grades }) => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };


  const handleSubmitImport = async () => {
    if (!file) return;

    try {
      const text = await file.text();
      const rows = text.split('\n');
      const headers = rows[0].split(',').map(h => h.trim());
      
      // Initialize indices as -1
      let studentIdIndex = -1;
      let scoreIndex = -1;

      // First try to find exact column matches
      studentIdIndex = headers.findIndex(h => h === 'LocalID' || h === 'Student ID');
      scoreIndex = headers.findIndex(h => h === 'Score' || h === 'Final Grade');

      // If not found, scan the first data row to find columns with matching patterns
      if (studentIdIndex === -1 || scoreIndex === -1) {
        const firstDataRow = rows[1]?.split(',').map(col => col.trim());
        
        if (firstDataRow) {
          // Look for 6-digit number (student ID)
          studentIdIndex = firstDataRow.findIndex(col => /^\d{6}$/.test(col));
          
          // Look for 2-3 digit number (grade)
          scoreIndex = firstDataRow.findIndex(col => /^\d{2,3}$/.test(col));

          // If still not found, scan all columns
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
        alert('Could not find student ID (6 digits) and grade (2-3 digits) columns in the file.');
        return;
      }

      const importedGrades: Record<string, string> = {};
      
      // Process each row (skip header)
      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',').map(col => col.trim());
        if (columns.length <= Math.max(studentIdIndex, scoreIndex)) continue;
        
        const studentId = columns[studentIdIndex];
        const score = columns[scoreIndex];

        // Validate both studentId and score
        if (/^\d{6}$/.test(studentId) && /^\d{2,3}$/.test(score)) {
          importedGrades[studentId] = score;
        }
      }

      // Update grades for all matching students
      const updatedGrades = { ...unsavedGrades };
      if (!updatedGrades[assignmentId]) {
        updatedGrades[assignmentId] = {};
      }

      // Get all periods for this assignment
      const assignmentPeriods = assignments[assignmentId].periods;

      // Look for matching students in all periods
      assignmentPeriods.forEach(period => {
        if (!updatedGrades[assignmentId][period]) {
          updatedGrades[assignmentId][period] = {};
        }

        students[period]?.forEach(student => {
          if (importedGrades[student.id]) {
            updatedGrades[assignmentId][period][student.id] = importedGrades[student.id];
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

      setFile(null);
      alert('Grades imported successfully!');
    } catch (error) {
      console.error('Error importing grades:', error);
      alert('Error importing grades. Please check the file format.');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          Import DMAC Scores
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import DMAC Scores</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
  );
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

// Add subject color constants
const SUBJECT_COLORS = {
  'Math 8': 'bg-purple-100 hover:bg-purple-200',
  'Algebra I': 'bg-green-100 hover:bg-green-200'
} as const;

// Add type color constants
const TYPE_COLORS = {
  'Daily': 'bg-yellow-50 hover:bg-yellow-100',
  'Assessment': 'bg-red-50 hover:bg-red-100'
} as const;

// Add ColorSettings component at the top level
const ColorSettings: FC<{
  showColors: boolean;
  colorMode: 'none' | 'subject' | 'type';
  onShowColorsChange: (show: boolean) => void;
  onColorModeChange: (mode: 'none' | 'subject' | 'type') => void;
}> = ({ showColors, colorMode, onShowColorsChange, onColorModeChange }) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={showColors}
          onCheckedChange={(checked) => onShowColorsChange(!!checked)}
        />
        <span className="text-sm">Show Colors</span>
      </div>
      {showColors && (
        <Select
          value={colorMode}
          onValueChange={(value: 'none' | 'subject' | 'type') => onColorModeChange(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Color by..." />
          </SelectTrigger>
          <SelectContent>
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
    showColors && colorMode === 'type' && TYPE_COLORS[assignment.type]
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

const GradeBook: FC = () => {
  // Change the initial value of showColors to false
  const [showColors, setShowColors] = useState(false);
  const [colorMode, setColorMode] = useState<'none' | 'subject' | 'type'>('none');
  
  // Move useState here
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('week');
  
  // Rest of your state declarations
  const [students, setStudents] = useState<Record<string, Student[]>>({});
  const [birthdayStudents, setBirthdayStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [newAssignment, setNewAssignment] = useState<Assignment | null>(null);
  const [grades, setGrades] = useState<GradeData>({});
  const [unsavedGrades, setUnsavedGrades] = useState<GradeData>({});
  const [editingGrades, setEditingGrades] = useState<Record<string, boolean>>({});
  const [expandedAssignments, setExpandedAssignments] = useState<Record<string, boolean>>({});
  const [selectedType, setSelectedType] = useState<'Daily' | 'Assessment'>('Daily');
  const [absences, setAbsences] = useState<Record<string, boolean>>({});
  const [lateWork, setLateWork] = useState<Record<string, boolean>>({});
  const [incomplete, setIncomplete] = useState<Record<string, boolean>>({});
  const [extraPoints, setExtraPoints] = useState<Record<string, string>>({});
  const [retest, setRetest] = useState<Record<string, boolean>>({});
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);
  const [studentSortOrder, setStudentSortOrder] = useState<'none' | 'highest' | 'lowest'>('none');
  const [tags, setTags] = useState<AssignmentTag[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [assignmentOrder, setAssignmentOrder] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'asc' | 'desc' | 'none'>('none');
  const [subjectFilter, setSubjectFilter] = useState<'all' | 'Math 8' | 'Algebra I'>('all');
  const [editingAssignment, setEditingAssignment] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'none' | 'type'>('none');
  const [showImport, setShowImport] = useState(false);
  const [syncingAssignments, setSyncingAssignments] = useState<Record<string, boolean>>({});
  const { data: session } = useSession();

  // Fetch students from Supabase
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .order('class_period, name');

        if (error) {
          console.error('Error fetching students:', error);
          return;
        }

        // Organize students by period
        const studentsByPeriod = data.reduce((acc: Record<string, Student[]>, student: Student) => {
          if (!acc[student.class_period]) {
            acc[student.class_period] = [];
          }
          acc[student.class_period].push(student);
          return acc;
        }, {});

        setStudents(studentsByPeriod);
      } catch (error) {
        console.error('Error in fetchStudents:', error);
      }
    };

    fetchStudents();
  }, []);

  // Load assignments and grades on component mount
  useEffect(() => {
    const loadAssignments = async () => {
      // First load assignments
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('*');
  
      if (assignmentError) {
        console.error('Error loading assignments:', assignmentError);
        return;
      }
  
      const formattedAssignments = assignmentData.reduce((acc, assignment) => ({
        ...acc,
        [assignment.id]: {
          ...assignment,
          date: new Date(assignment.date)
        }
      }), {});
  
      setAssignments(formattedAssignments);
      setAssignmentOrder(Object.keys(formattedAssignments));
  
      // Then load grades in a separate query
      const { data: gradeData, error: gradeError } = await supabase
        .from('grades')
        .select('*');
  
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
  }, []);

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
  const handleNewAssignment = () => {
    // If clicked without a date, select today's date
    const dateToUse = selectedDate || new Date();
    setSelectedDate(dateToUse);
    
    setNewAssignment({
      date: dateToUse,
      name: '',
      periods: [],
      type: selectedType,
      subject: 'Math 8'
    });
  };

const handleAssignmentNameChange = (name: string) => {
  setNewAssignment(prev => prev ? { ...prev, name } : null);
};

const handlePeriodsSelect = (selectedPeriod: string) => {
  setNewAssignment(prev => {
    if (!prev) return null;
    const periods = prev.periods.includes(selectedPeriod)
      ? prev.periods.filter(p => p !== selectedPeriod)
      : [...prev.periods, selectedPeriod];
    return {
      ...prev,
      periods
    };
  });
};

const handleGradeChange = async (assignmentId: string, periodId: string, studentId: string, grade: string) => {
  const numericGrade = parseInt(grade) || 0;
  const totalGrade = calculateTotal(
    grade,
    extraPoints[`${assignmentId}-${periodId}-${studentId}`] || '0'
  );
  
  // Auto-assign retest tag if total grade is below 70 and it's an Assessment
  if (totalGrade < 70 && assignments[assignmentId].type === 'Assessment') {
    const existingTag = tags.find(tag => 
      tag.assignment_id === assignmentId && 
      tag.period === periodId && 
      tag.student_id === parseInt(studentId) && 
      tag.tag_type === 'retest'
    );
    
    if (!existingTag) {
      await handleTagToggle(assignmentId, periodId, parseInt(studentId), 'retest');
    }
  }

  const finalGrade = grade === '' ? '0' : grade;
  setUnsavedGrades(prev => ({
    ...prev,
    [assignmentId]: {
      ...prev[assignmentId],
      [periodId]: {
        ...prev[assignmentId]?.[periodId],
        [studentId]: finalGrade
      }
    }
  }));
  setEditingGrades(prev => ({
    ...prev,
    [`${assignmentId}-${periodId}`]: true
  }));
};

const deleteAssignment = async (assignmentId: string) => {
  if (!confirm('Are you sure you want to delete this assignment?')) {
    return;
  }

  try {
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assignmentId)) {
      throw new Error('Invalid assignment ID format');
    }

    // Delete all related data in order
    console.log('Deleting assignment:', assignmentId);

    const { error: tagsError } = await supabase
      .from('assignment_tags')
      .delete()
      .eq('assignment_id', assignmentId);

    if (tagsError) throw tagsError;

    const { error: gradesError } = await supabase
      .from('grades')
      .delete()
      .eq('assignment_id', assignmentId);

    if (gradesError) throw gradesError;

    const { error: assignmentError } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (assignmentError) throw assignmentError;

    // Update local state
    setAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[assignmentId];
      return newAssignments;
    });

    setAssignmentOrder(prev => prev.filter(id => id !== assignmentId));
    setTags(prev => prev.filter(tag => tag.assignment_id !== assignmentId));

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

const saveGrades = async (assignmentId: string) => {
  try {
    const assignment = assignments[assignmentId];
    if (!assignment) return;

    // Collect all the grades we want to save
    const gradesToSave = assignment.periods.flatMap(periodId => {
      const periodGrades = unsavedGrades[assignmentId]?.[periodId] || {};
      return Object.entries(periodGrades)
        .filter(([_, grade]) => grade !== '' && grade !== '0') // Only save non-empty, non-zero grades
        .map(([studentId, grade]) => ({
          assignment_id: assignmentId,
          student_id: parseInt(studentId),
          period: periodId,
          grade: grade,
          extra_points: extraPoints[`${assignmentId}-${periodId}-${studentId}`] || '0'
        }));
    });

    if (gradesToSave.length > 0) {
      // First, delete existing grades for this assignment
      const { error: deleteError } = await supabase
        .from('grades')
        .delete()
        .eq('assignment_id', assignmentId);

      if (deleteError) {
        throw new Error('Failed to delete existing grades');
      }

      // Then insert new grades
      const { error: insertError } = await supabase
        .from('grades')
        .insert(gradesToSave);

      if (insertError) {
        throw new Error('Failed to insert new grades');
      }
    }

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

    alert('Grades saved successfully!');
  } catch (error) {
    console.error('Error saving grades:', error);
    alert('Failed to save grades. Please try again.');
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
      id: crypto.randomUUID(), // Use crypto.randomUUID() instead of uuidv4()
      name: newAssignment.name,
      date: format(newAssignment.date, 'yyyy-MM-dd'),
      type: selectedType,
      periods: newAssignment.periods,
      subject: newAssignment.subject,
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
  a.download = `${assignment.name}-${periodId}-grades.csv`;
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
    a.download = `grades-export.csv`;
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
  
  // Apply subject filter
  if (subjectFilter !== 'all') {
    entries = entries.filter(([_, assignment]) => assignment.subject === subjectFilter);
  }

  // Apply date sorting
  if (dateFilter !== 'none') {
    entries.sort(([, a], [, b]) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateFilter === 'asc' ? dateA - dateB : dateB - dateA;
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
                  {format(assignment.date, 'PPP')}
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
          </div>
        </div>
      ) : (
        <div onClick={() => setEditingAssignment(assignmentId)}>
          <CardTitle>{assignment.name}</CardTitle>
          <div className="text-sm text-muted-foreground">
            {format(assignment.date, 'PPP')} - {assignment.subject}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            deleteAssignment(assignmentId);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
        {expandedAssignments[assignmentId] ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </CardHeader>
    {expandedAssignments[assignmentId] && (
      <CardContent>
        <Tabs 
          defaultValue={activeTab || assignment.periods[0]} 
          onValueChange={setActiveTab}
          value={activeTab || assignment.periods[0]} // Add this line
        >
          <TabsList className="w-full">
            {assignment.periods.map(periodId => (
              <TabsTrigger
                key={periodId}
                value={periodId}
                className="flex-1"
              >
                Period {periodId}
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
                <div className="space-y-2">
                  {sortStudents(students[periodId] || [], assignmentId, periodId).map(student => (
                    <div key={student.id} className="grid grid-cols-[auto_1fr_70px_70px_70px] gap-2 items-center">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTagToggle(assignmentId, periodId, student.id, 'absent')}
                          className={cn(
                            "px-2 h-6 text-xs",
                            hasTag(assignmentId, periodId, String(student.id), 'absent') && "bg-red-100"
                          )}
                        >
                          Abs
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTagToggle(assignmentId, periodId, student.id, 'late')}
                          className={cn(
                            "px-2 h-6 text-xs",
                            hasTag(assignmentId, periodId, String(student.id), 'late') && "bg-yellow-100"
                          )}
                        >
                          Late
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTagToggle(assignmentId, periodId, student.id, 'incomplete')}
                          className={cn(
                            "px-2 h-6 text-xs",
                            hasTag(assignmentId, periodId, String(student.id), 'incomplete') && "bg-orange-100"
                          )}
                        >
                          Inc
                        </Button>
                        {assignment.type === 'Assessment' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTagToggle(assignmentId, periodId, student.id, 'retest')}
                            className={cn(
                              "px-2 h-6 text-xs",
                              hasTag(assignmentId, periodId, String(student.id), 'retest') && "bg-blue-100"
                            )}
                          >
                            Retest
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center bg-secondary rounded px-2 py-1">
                        <span className="text-sm text-muted-foreground mr-2">
                          {student.id}
                        </span>
                        <span className="text-sm">{student.name}</span>
                      </div>
                      <Input
                        id={`grade-${assignmentId}-${periodId}-${student.id}`}
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        className="text-center h-8 text-sm"
                        value={
                          editingGrades[`${assignmentId}-${periodId}`] 
                            ? unsavedGrades[assignmentId]?.[periodId]?.[student.id] || ''
                            : grades[assignmentId]?.[periodId]?.[student.id] || ''
                        }
                        onChange={(e) => handleGradeChange(assignmentId, periodId, String(student.id), e.target.value)}
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="+0"
                        className="text-center h-8 text-sm"
                        value={extraPoints[`${assignmentId}-${periodId}-${student.id}`] || ''}
                        onChange={(e) => handleExtraPointsChange(assignmentId, periodId, student.id, e.target.value)}
                      />
                      <div className="flex items-center justify-center bg-secondary rounded px-2 h-8">
                        <span className="text-sm font-medium">
                          {calculateTotal(
                            editingGrades[`${assignmentId}-${periodId}`]
                              ? unsavedGrades[assignmentId]?.[periodId]?.[student.id]
                              : grades[assignmentId]?.[periodId]?.[student.id],
                            extraPoints[`${assignmentId}-${periodId}-${student.id}`]
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <ImportScoresDialog
                  assignmentId={assignmentId}
                  periodId={periodId}
                  onImport={(grades) => handleImportGrades(assignmentId, periodId, grades)}
                  unsavedGrades={unsavedGrades}
                  setUnsavedGrades={setUnsavedGrades}
                  setEditingGrades={setEditingGrades}
                  assignments={assignments}
                  students={students}
                  grades={grades}
                />
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
                <div className="text-xs text-muted-foreground">
                  <pre className="bg-slate-50 p-2 rounded">
                    {JSON.stringify({
                      hasGoogleId: !!assignment.google_classroom_id,
                      googleId: assignment.google_classroom_id,
                      isLinked: !!assignment.google_classroom_id
                    }, null, 2)}
                  </pre>
                </div>
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
    return {
      Daily: entries.filter(([_, assignment]) => assignment.type === 'Daily'),
      Assessment: entries.filter(([_, assignment]) => assignment.type === 'Assessment')
    };
  }

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
                  {/* ...rest of Daily column... */}
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
                  {/* ...rest of Assessment column... */}
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

return (
  <div className="p-6">
    <div className="flex gap-6">
      {/* Left side - Collapsible Calendar */}
      <div className={cn("space-y-4", !isCalendarVisible && "w-auto")}>
        <Button 
          variant="outline" 
          onClick={() => setIsCalendarVisible(prev => !prev)}
          className="w-full"
        >
          {isCalendarVisible ? <ChevronLeft /> : <ChevronRight />}
          {isCalendarVisible ? "Hide Calendar" : "Show Calendar"}
        </Button>
        
        {isCalendarVisible && (
          <Card className="w-96">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Calendar</CardTitle>
                <Select
                  defaultValue="month"
                  onValueChange={(value) => setCalendarView(value as 'month' | 'week')}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="View" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {calendarView === 'month' ? (
                <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={handleDateSelect}
                  className="w-full"
                  modifiers={{
                    assignment: (date) => {
                      return Object.values(assignments).some(
                        assignment => assignment.date.toDateString() === date.toDateString()
                      );
                    }
                  }}
                  modifiersStyles={{
                    assignment: {
                      border: '2px solid var(--primary)',
                    }
                  }}
                />
              ) : (
                <CustomWeekView
                  date={selectedDate || new Date()}
                  onDateSelect={handleDateSelect}
                  assignments={assignments}
                  onWeekChange={handleWeekChange}
                />
              )}
              <BirthdayList 
                students={Object.values(students).flat()}
                currentDate={selectedDate || new Date()}
                view={calendarView}
              />
              <TodoList 
                tags={tags}
                students={students}
                assignments={assignments}
                onRemoveTag={handleRemoveTag}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right side */}
      <div className="flex-grow space-y-4">
        <Button
          onClick={handleNewAssignment}
          className="w-full"
        >
          Create New Assignment
        </Button>

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
              
              {/* Group the dropdowns in one row */}
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
                          setNewAssignment(prev => prev ? { ...prev, date } : null);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Rest of the form remains the same */}
              <div className="border rounded-md p-4">
                <div className="text-sm font-medium mb-2">Select Periods</div>
                {Object.keys(students).map(periodId => (
                  <div key={periodId} className="flex items-center gap-2 mb-2">
                    <Checkbox 
                      checked={newAssignment?.periods.includes(periodId)}
                      onCheckedChange={() => handlePeriodsSelect(periodId)}
                    />
                    <span>Period {periodId}</span>
                  </div>
                ))}
              </div>
              <Button onClick={saveAssignment} className="w-full">
                Create Assignment
              </Button>
            </CardContent>
          </Card>
        )}
        {/* Existing Assignments */}
        <div className="flex gap-4 mb-4">
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
            onValueChange={(value: 'asc' | 'desc' | 'none') => setDateFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Manual Sort</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
              <SelectItem value="desc">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <ColorSettings 
              showColors={showColors}
              colorMode={colorMode}
              onShowColorsChange={setShowColors}
              onColorModeChange={setColorMode}
            />
            <Select
              value={groupBy}
              onValueChange={(value: 'none' | 'type') => setGroupBy(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Group by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="type">By Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <GradeExportDialog 
            assignments={assignments}
            students={students}
            onExport={exportGrades} 
          />
        </div>
        {renderAssignmentsSection()}
      </div>
    </div>
  </div>
);
};

export default GradeBook;

