'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, TYPE_COLORS, SUBJECT_COLORS } from '@/lib/constants';
import { Assignment } from '@/types/gradebook';

interface StudentData {
  id: number;
  name: string;
  period: string;
  google_email: string;
}

export function StudentDashboard() {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [extraPoints, setExtraPoints] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const loadStudentData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.email) {
        // Get student data
        const { data: studentData } = await supabase
          .from('student_mappings')
          .select('student_id, period, google_email')
          .eq('google_email', session.user.email)
          .single();

        if (studentData) {
          // Get student details
          const { data: studentDetails } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentData.student_id)
            .single();

          setStudent({ ...studentData, ...studentDetails });

          // Get assignments for student's period
          const { data: assignmentData } = await supabase
            .from('assignments')
            .select('*')
            .contains('periods', [studentData.period])
            .order('date', { ascending: false });

          if (assignmentData) {
            setAssignments(assignmentData.map(a => ({
              ...a,
              date: new Date(a.date)
            })));

            // Get grades for these assignments
            const { data: gradeData } = await supabase
              .from('grades')
              .select('*')
              .eq('student_id', studentData.student_id);

            if (gradeData) {
              const gradeMap: Record<string, string> = {};
              const extraPointsMap: Record<string, string> = {};

              gradeData.forEach(grade => {
                gradeMap[grade.assignment_id] = grade.grade;
                if (grade.extra_points) {
                  extraPointsMap[grade.assignment_id] = grade.extra_points;
                }
              });

              setGrades(gradeMap);
              setExtraPoints(extraPointsMap);
            }

            // Get tags for these assignments
            const { data: tagData } = await supabase
              .from('assignment_tags')
              .select('*')
              .eq('student_id', studentData.student_id);

            if (tagData) {
              setTags(tagData);
            }
          }
        }
      }
    };

    loadStudentData();
  }, []);

  const calculateTotal = (assignmentId: string): number => {
    const grade = parseInt(grades[assignmentId] || '0');
    const extra = parseInt(extraPoints[assignmentId] || '0');
    return Math.min(100, grade + extra);
  };

  const getAssignmentStatus = (assignment: Assignment, grade?: string) => {
    if (!grade) return 'not_started';
    const total = calculateTotal(assignment.id);
    if (assignment.type === 'Assessment' && total < 70) return 'needs_retest';
    return 'completed';
  };

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  const averages = assignments.reduce((acc, assignment) => {
    const total = calculateTotal(assignment.id);
    if (total > 0) {
      if (!acc[assignment.type]) {
        acc[assignment.type] = { sum: 0, count: 0 };
      }
      acc[assignment.type].sum += total;
      acc[assignment.type].count++;
    }
    return acc;
  }, {} as Record<string, { sum: number; count: number }>);

  const dailyAverage = averages['Daily']?.count > 0 
    ? Math.round(averages['Daily'].sum / averages['Daily'].count) 
    : 0;

  const assessmentAverage = averages['Assessment']?.count > 0 
    ? Math.round(averages['Assessment'].sum / averages['Assessment'].count) 
    : 0;

  const finalAverage = Math.round((dailyAverage * 0.6) + (assessmentAverage * 0.4));

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with averages */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyAverage}%</div>
            <p className="text-xs text-muted-foreground">
              {averages['Daily']?.count || 0} assignments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Test Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assessmentAverage}%</div>
            <p className="text-xs text-muted-foreground">
              {averages['Assessment']?.count || 0} assignments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Final Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finalAverage}%</div>
            <p className="text-xs text-muted-foreground">
              60% Daily / 40% Tests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {assignments.map(assignment => {
          const grade = grades[assignment.id];
          const status = getAssignmentStatus(assignment, grade);
          const extraPoint = extraPoints[assignment.id];
          const total = calculateTotal(assignment.id);
          const assignmentTags = tags.filter(t => t.assignment_id === assignment.id);

          return (
            <Card 
              key={assignment.id}
              className={cn(
                "transition-colors",
                assignment.type === 'Assessment' ? 'border-l-4 border-l-blue-500' : ''
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{assignment.name}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {format(assignment.date, 'PPP')} · {assignment.subject}
                    </div>
                  </div>
                  {grade && (
                    <div className="text-right">
                      <div className="text-2xl font-bold">{total}%</div>
                      {extraPoint && (
                        <div className="text-sm text-green-600">+{extraPoint}</div>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              {assignmentTags.length > 0 && (
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    {assignmentTags.map(tag => (
                      <span 
                        key={tag.id}
                        className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          tag.tag_type === 'absent' && "bg-red-100 text-red-700",
                          tag.tag_type === 'late' && "bg-yellow-100 text-yellow-700",
                          tag.tag_type === 'incomplete' && "bg-orange-100 text-orange-700",
                          tag.tag_type === 'retest' && "bg-blue-100 text-blue-700"
                        )}
                      >
                        {tag.tag_type.charAt(0).toUpperCase() + tag.tag_type.slice(1)}
                      </span>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
