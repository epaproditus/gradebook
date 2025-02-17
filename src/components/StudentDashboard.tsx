'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, TYPE_COLORS } from '@/lib/constants';

interface StudentAssignment {
  id: string;
  name: string;
  date: Date;
  type: 'Daily' | 'Assessment';
  subject: 'Math 8' | 'Algebra I';
  grade?: string;
  status?: string;
}

export function StudentDashboard() {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [student, setStudent] = useState<any>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const loadStudentData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get student record
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('google_email', session.user.email)
        .single();

      if (studentData) {
        setStudent(studentData);

        // Get assignments and grades for student's period
        const { data: assignmentData } = await supabase
          .from('assignments')
          .select(`
            *,
            grades!inner(grade)
          `)
          .eq('grades.student_id', studentData.id)
          .contains('periods', [studentData.class_period]);

        if (assignmentData) {
          setAssignments(assignmentData.map(a => ({
            ...a,
            date: new Date(a.date),
            grade: a.grades[0].grade
          })));
        }
      }
    };

    loadStudentData();
  }, []);

  // Calculate weighted average
  const calculateAverage = () => {
    if (assignments.length === 0) return 0;

    const dailyGrades = assignments
      .filter(a => a.type === 'Daily' && a.grade)
      .map(a => parseInt(a.grade!));

    const assessmentGrades = assignments
      .filter(a => a.type === 'Assessment' && a.grade)
      .map(a => parseInt(a.grade!));

    const dailyAvg = dailyGrades.length > 0
      ? dailyGrades.reduce((a, b) => a + b, 0) / dailyGrades.length
      : 0;

    const assessmentAvg = assessmentGrades.length > 0
      ? assessmentGrades.reduce((a, b) => a + b, 0) / assessmentGrades.length
      : dailyAvg;

    return Math.round((dailyAvg * 0.8) + (assessmentAvg * 0.2));
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Welcome, {student?.name}
        </h1>
        <p className="text-lg">
          Current Average: {calculateAverage()}%
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.map(assignment => (
          <Card
            key={assignment.id}
            className={cn(
              "transition-colors",
              TYPE_COLORS[assignment.type],
              assignment.status && STATUS_COLORS[assignment.status].bg
            )}
          >
            <CardHeader>
              <CardTitle className="flex justify-between">
                <div>
                  <div>{assignment.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(assignment.date, 'PP')} - {assignment.subject}
                  </div>
                </div>
                <div className="text-xl font-bold">
                  {assignment.grade || '-'}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                Type: {assignment.type}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
