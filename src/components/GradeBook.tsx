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

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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
}

interface GradeData {
  [key: string]: {
    [key: string]: {
      [key: string]: string;
    };
  };
}

const GradeBook: FC = () => {
  const [students, setStudents] = useState<Record<string, Student[]>>({});
  const [birthdayStudents, setBirthdayStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [newAssignment, setNewAssignment] = useState<Assignment | null>(null);
  const [grades, setGrades] = useState<GradeData>({});
  const [unsavedGrades, setUnsavedGrades] = useState<GradeData>({});
  const [editingGrades, setEditingGrades] = useState<Record<string, boolean>>({});
  const [expandedAssignments, setExpandedAssignments] = useState<Record<string, boolean>>({});

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

  // Check for birthdays on date selection
  const checkBirthdays = (date: Date) => {
    const selectedMonth = date.getMonth();
    const selectedDay = date.getDate();

    const birthdayStudents = Object.values(students)
      .flat()
      .filter(student => {
        const birthday = new Date(student.birthday);
        return birthday.getMonth() === selectedMonth && birthday.getDate() === selectedDay;
      });

    setBirthdayStudents(birthdayStudents);
  };

  const handleDateSelect = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      checkBirthdays(date);
      setNewAssignment({
        date,
        name: '',
        periods: []
      });
    }
  };

  const handleAssignmentNameChange = (name: string) => {
    setNewAssignment(prev => prev ? { ...prev, name } : null);
  };

  const handlePeriodsSelect = (selectedPeriod: string) => {
    setNewAssignment(prev => {
      if (!prev) return null;
      return {
        ...prev,
        periods: Array.from(new Set([...prev.periods, selectedPeriod]))
      };
    });
  };

  const handleGradeChange = (assignmentId: string, periodId: string, studentId: string, grade: string) => {
    setUnsavedGrades(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [periodId]: {
          ...prev[assignmentId]?.[periodId],
          [studentId]: grade
        }
      }
    }));
    setEditingGrades(prev => ({
      ...prev,
      [`${assignmentId}-${periodId}`]: true
    }));
  };

  const deleteAssignment = (assignmentId: string) => {
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

  const saveGrades = (assignmentId: string, periodId: string) => {
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

  const saveAssignment = () => {
    if (!newAssignment?.name || newAssignment.periods.length === 0) {
      alert('Please fill in assignment name and select at least one period');
      return;
    }

    const assignmentId = `${newAssignment.date.toISOString()}-${newAssignment.name}`;
    setAssignments(prev => ({
      ...prev,
      [assignmentId]: {
        ...newAssignment,
        date: newAssignment.date
      }
    }));
    setNewAssignment(null);
    setSelectedDate(null);
  };

  const exportGrades = (assignmentId: string, periodId: string) => {
    const assignment = assignments[assignmentId];
    const periodStudents = students[periodId] || [];
    const assignmentGrades = grades[assignmentId]?.[periodId] || {};

    // Create CSV data
    const csvData = [
      ['Student ID', 'Student Name', 'Grade'], // Header
      ...periodStudents.map(student => [
        student.id,
        student.name,
        assignmentGrades[student.id] || ''
      ])
    ];

    // Convert to CSV string
    const csv = csvData.map(row => row.join(',')).join('\n');

    // Create and trigger download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assignment.name}-${periodId}-grades.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="flex gap-6">
        {/* Left side - Calendar */}
        <Card className="w-96 h-fit">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="w-full"
            />
            {birthdayStudents.length > 0 && (
              <div className="mt-4 p-4 bg-secondary rounded-lg">
                <div className="text-xl mb-2">🎉🎂🥳</div>
                <div>Birthday Celebrations:</div>
                {birthdayStudents.map(student => (
                  <div key={student.id} className="text-sm">
                    {student.name}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right side - Assignments and Grades */}
        <div className="flex-grow space-y-4">
          {/* New Assignment Form */}
          {newAssignment && (
            <Card>
              <CardHeader>
                <CardTitle>New Assignment for {newAssignment.date.toLocaleDateString()}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Assignment Name"
                  value={newAssignment.name}
                  onChange={(e) => handleAssignmentNameChange(e.target.value)}
                />
                <Select onValueChange={handlePeriodsSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Periods" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(students).map(periodId => (
                      <SelectItem key={periodId} value={periodId}>
                        Period {periodId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2 flex-wrap">
                  {newAssignment.periods.map(periodId => (
                    <div key={periodId} className="bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      Period {periodId}
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
          {Object.entries(assignments).map(([assignmentId, assignment]) => (
            <Card key={assignmentId} className="w-full">
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
                          <Button
                            onClick={() => exportGrades(assignmentId, periodId)}
                            variant="outline"
                            className="w-full flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Export Grades
                          </Button>

                          <div className="grid grid-cols-[auto_100px] gap-4">
                            {(students[periodId] || []).map(student => (
                              <React.Fragment key={student.id}>
                                <div className="flex items-center bg-secondary rounded px-4 py-2">
                                  <span className="text-sm text-muted-foreground mr-2">
                                    {student.id}
                                  </span>
                                  <span>{student.name}</span>
                                </div>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="Grade"
                                  className="text-center h-full aspect-square"
                                  value={
                                    (editingGrades[`${assignmentId}-${periodId}`] ?
                                      unsavedGrades[assignmentId]?.[periodId]?.[student.id] :
                                      grades[assignmentId]?.[periodId]?.[student.id]) || ''
                                  }
                                  onChange={(e) => handleGradeChange(assignmentId, periodId, student.id, e.target.value)}
                                />
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        {editingGrades[`${assignmentId}-${periodId}`] && (
                          <div className="mt-4 flex justify-end">
                            <Button
                              onClick={() => saveGrades(assignmentId, periodId)}
                              className="flex items-center gap-2"
                            >
                              <Save className="h-4 w-4" />
                              Save Grades
                            </Button>
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GradeBook;
