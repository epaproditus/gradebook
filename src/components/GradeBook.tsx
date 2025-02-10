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
import { X, Save, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { startOfWeek, addDays, isSameDay, format } from 'date-fns';

// Initialize Supabase client (this is fine outside component)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Move interfaces outside component
interface Student {
  id: string;
  name: string;
  birthday: string;
  class_period: string;
}

interface Assignment {
  date: Date;
  name: string;
  periods: string[];
  type: 'Daily' | 'Assessment';
}

interface GradeData {
  [key: string]: {
    [key: string]: {
      [key: string]: string;
    };
  };
}

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
}> = ({ assignmentId, periodId, onImport, unsavedGrades, setUnsavedGrades, setEditingGrades, assignments, students }) => {
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
      const headers = rows[0].split(',');
      
      const localIdIndex = headers.findIndex(h => h.trim() === 'LocalID');
      const scoreIndex = headers.findIndex(h => h.trim() === 'Score');
      
      if (localIdIndex === -1 || scoreIndex === -1) {
        alert('Invalid file format. Missing LocalID or Score columns.');
        return;
      }
  
      const importedGrades: Record<string, string> = {};
      
      rows.slice(1).forEach(row => {
        const columns = row.split(',').map(col => col.trim());
        const localId = columns[localIdIndex];
        const score = columns[scoreIndex];
  
        if (localId && score) {
          importedGrades[localId] = score;
        }
      });
  
      onImport(importedGrades);
      setFile(null);
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
  onSelect: (studentId: string, periodId: string) => void;  // Update this prop
}> = ({ students, assignmentId, onSelect }) => {
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

const GradeBook: FC = () => {
  // Move useState here
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  
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
  
      // Load grades for all assignments
      const { data: gradeData, error: gradeError } = await supabase
        .from('grades')
        .select('*');
  
      if (gradeError) {
        console.error('Error loading grades:', gradeError);
        return;
      }
  
      const formattedGrades = gradeData.reduce((acc, grade) => ({
        ...acc,
        [grade.assignment_id]: {
          ...acc[grade.assignment_id],
          [grade.period]: {
            ...acc[grade.assignment_id]?.[grade.period],
            [grade.student_id]: grade.grade
          }
        }
      }), {});
  
      setGrades(formattedGrades);
    };
  
    loadAssignments();
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

  // Add a new button for creating assignments
  const handleNewAssignment = () => {
    if (!selectedDate) return;
    
    setNewAssignment({
      date: selectedDate,
      name: '',
      periods: [],
      type: selectedType
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

  const handleGradeChange = (assignmentId: string, periodId: string, studentId: string, grade: string) => {
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
    // Delete grades first (due to foreign key constraint)
    await supabase
      .from('grades')
      .delete()
      .match({ assignment_id: assignmentId });
  
    // Then delete the assignment
    const { error } = await supabase
      .from('assignments')
      .delete()
      .match({ id: assignmentId });
  
    if (error) {
      console.error('Error deleting assignment:', error);
      return;
    }
  
    setAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[assignmentId];
      return newAssignments;
    });
  };

  const toggleAssignment = (assignmentId: string) => {
    setExpandedAssignments(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  const saveGrades = async (assignmentId: string, periodId: string) => {
    const gradesToSave = unsavedGrades[assignmentId]?.[periodId] || {};
    const gradeEntries = Object.entries(gradesToSave).map(([studentId, grade]) => ({
      assignment_id: assignmentId,
      student_id: studentId,
      period: periodId,
      grade: grade
    }));
  
    // Delete existing grades for this assignment and period
    await supabase
      .from('grades')
      .delete()
      .match({ assignment_id: assignmentId, period: periodId });
  
    // Insert new grades
    const { error } = await supabase
      .from('grades')
      .insert(gradeEntries);
  
    if (error) {
      console.error('Error saving grades:', error);
      return;
    }
  
    setGrades(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [periodId]: {
          ...prev[assignmentId]?.[periodId],
          ...unsavedGrades[assignmentId]?.[periodId]
        }
      }
    }));
  
    setEditingGrades(prev => ({
      ...prev,
      [`${assignmentId}-${periodId}`]: false
    }));
  };

  const saveAssignment = async () => {
    if (!newAssignment?.name || newAssignment.periods.length === 0) {
      alert('Please fill in assignment name and select at least one period');
      return;
    }
  
    const assignmentId = `${newAssignment.date.toISOString()}-${newAssignment.name}`;
    const assignmentData = {
      id: assignmentId,
      name: newAssignment.name,
      date: newAssignment.date.toISOString().split('T')[0],
      type: selectedType,
      periods: newAssignment.periods
    };
  
    const { error } = await supabase
      .from('assignments')
      .insert(assignmentData);
  
    if (error) {
      console.error('Error saving assignment:', error);
      return;
    }
  
    setAssignments(prev => ({
      ...prev,
      [assignmentId]: {
        ...newAssignment,
        date: newAssignment.date,
        type: selectedType
      }
    }));
    setNewAssignment(null);
    setSelectedDate(null);
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
      ['Student ID', 'Assignment Grade', 'First Name', 'Last Name'].join(','),
      ...periodStudents.map(student => {
        const [lastName, firstName] = student.name.split(',').map(part => part.trim());
        return [
          student.id,
          assignmentGrades[student.id] || '0',
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
          const assignment = assignments[assignmentId];
          const periodStudents = students[periodId] || [];
          const assignmentGrades = grades[assignmentId]?.[periodId] || {};
  
          return periodStudents.map(student => {
            const [lastName, firstName] = student.name.split(',').map(part => part.trim());
            return [
              student.id,
              assignmentGrades[student.id] || '0',
              firstName,
              lastName,
              periodId,
              assignment.name
            ];
          });
        })
      );
  
      const csvData = [
        ['Student ID', 'Assignment Grade', 'First Name', 'Last Name', 'Period', 'Assignment'].join(','),
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
        const studentExists = students[period]?.some(s => s.id === localId);
        if (studentExists) {
          if (!updatedGrades[assignmentId][period]) {
            updatedGrades[assignmentId][period] = {};
          }
          updatedGrades[assignmentId][period][localId] = score;
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

  const handleExtraPointsChange = (assignmentId: string, periodId: string, studentId: string, points: string) => {
    setExtraPoints(prev => ({
      ...prev,
      [`${assignmentId}-${periodId}-${studentId}`]: points
    }));
  };

  const calculateTotal = (grade: string = '0', extra: string = '0') => {
    const baseGrade = parseInt(grade) || 0;
    const extraGrade = parseInt(extra) || 0;
    return Math.min(100, baseGrade + extraGrade);
  };

  const handleRetestToggle = (assignmentId: string, periodId: string, studentId: string) => {
    const key = `${assignmentId}-${periodId}-${studentId}`;
    setRetest(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="p-6">
      <div className="flex gap-6">
        {/* Left side */}
        <div className="space-y-4">
          <StudentSearch 
            students={students}
            onStudentSelect={(student) => {
              // Scroll to student or highlight their row
              const element = document.getElementById(`student-${student.id}`);
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
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
                <WeekView
                  date={selectedDate || new Date()}
                  onDateSelect={(date) => handleDateSelect(date)}
                  assignments={assignments}
                />
              )}
              <BirthdayList
                students={Object.values(students).flat()}
                currentDate={selectedDate || new Date()}
                view={calendarView}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right side */}
        <div className="flex-grow space-y-4">
          {selectedDate && (
            <Button
              onClick={handleNewAssignment}
              className="w-full"
            >
              Create New Assignment for {selectedDate.toLocaleDateString()}
            </Button>
          )}
          {newAssignment && (
            <Card>
              <CardHeader>
                <CardTitle>New Assignment for {selectedDate?.toLocaleDateString()}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Assignment Name"
                  value={newAssignment?.name || ''}
                  onChange={(e) => handleAssignmentNameChange(e.target.value)}
                />
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
                <Select 
                  value={selectedType}
                  onValueChange={(value: 'Daily' | 'Assessment') => setSelectedType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assignment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Assessment">Assessment</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={saveAssignment} className="w-full">
                  Create Assignment
                </Button>
              </CardContent>
            </Card>
          )}
          {/* Existing Assignments */}
          {Object.entries(assignments).map(([assignmentId, assignment]) => (
            <Card 
              key={assignmentId} 
              className="w-full mb-2"
            >
              <CardHeader
                className="flex flex-row items-center justify-between cursor-pointer"
                onClick={() => toggleAssignment(assignmentId)}
              >
                <div>
                  <CardTitle>{assignment.name}</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {assignment.date.toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <Tabs defaultValue={assignment.periods[0]}>
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
                              // Switch to correct period tab if needed
                              const tabTrigger = document.querySelector(`[value="${periodId}"]`) as HTMLButtonElement;
                              if (tabTrigger) tabTrigger.click();
                              
                              // Focus on grade input
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
                          />
                          <div className="grid grid-cols-[auto_1fr_70px_70px_70px] gap-2">
                            {(students[periodId] || []).map(student => (
                              <React.Fragment key={student.id}>
                                <div id={`student-${student.id}-${assignmentId}`} className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAbsenceToggle(assignmentId, periodId, student.id)}
                                    className={cn(
                                      "px-2 h-6 text-xs",
                                      absences[`${assignmentId}-${periodId}-${student.id}`] && "bg-red-100"
                                    )}
                                  >
                                    Abs
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleLateToggle(assignmentId, periodId, student.id)}
                                    className={cn(
                                      "px-2 h-6 text-xs",
                                      lateWork[`${assignmentId}-${periodId}-${student.id}`] && "bg-yellow-100"
                                    )}
                                  >
                                    Late
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleIncompleteToggle(assignmentId, periodId, student.id)}
                                    className={cn(
                                      "px-2 h-6 text-xs",
                                      incomplete[`${assignmentId}-${periodId}-${student.id}`] && "bg-orange-100"
                                    )}
                                  >
                                    Inc
                                  </Button>
                                  {assignment.type === 'Assessment' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRetestToggle(assignmentId, periodId, student.id)}
                                      className={cn(
                                        "px-2 h-6 text-xs",
                                        retest[`${assignmentId}-${periodId}-${student.id}`] && "bg-blue-100"
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
                                  onChange={(e) => handleGradeChange(assignmentId, periodId, student.id, e.target.value)}
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
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                        
                        <div className="mt-4 flex justify-between items-center">
                          {assignment.type === 'Assessment' && (
                            <ImportScoresDialog
                              assignmentId={assignmentId}
                              periodId={periodId}
                              onImport={(grades) => handleImportGrades(assignmentId, periodId, grades)}
                              unsavedGrades={unsavedGrades}
                              setUnsavedGrades={setUnsavedGrades}
                              setEditingGrades={setEditingGrades}
                              assignments={assignments}
                              students={students}
                            />
                          )}
                          <Button
                            onClick={() => saveGrades(assignmentId, periodId)}
                            className="flex items-center gap-2"
                          >
                            <Save className="h-4 w-4" />
                            Save Grades
                          </Button>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              )}
            </Card>
          ))}
          <GradeExportDialog 
            assignments={assignments} 
            students={students}
            onExport={exportGrades} 
          />
        </div>
      </div>
    </div>
  );
};

export default GradeBook;

