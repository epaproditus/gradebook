'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, TYPE_COLORS, SUBJECT_COLORS } from '@/lib/constants';
import { Assignment } from '@/types/gradebook';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from 'lucide-react';
import { calculateWeightedAverage, calculateTotal } from '@/lib/gradeCalculations';
import { SignOutButton } from './SignOutButton';

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
  const [expandedAssignments, setExpandedAssignments] = useState<Set<string>>(new Set());
  const [showColors, setShowColors] = useState(true);
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });

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

  const getAssignmentStatus = (assignment: Assignment, grade?: string) => {
    if (!grade) return 'not_started';
    const total = calculateTotal(grades[assignment.id], extraPoints[assignment.id] || '0');
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

  const validAssignments = assignments.map(assignment => ({
    grade: grades[assignment.id] || '0',
    extra: extraPoints[assignment.id] || '0',
    total: calculateTotal(
      grades[assignment.id] || '0', 
      extraPoints[assignment.id] || '0'
    ),
    type: assignment.type as 'Daily' | 'Assessment',
    hasGrade: !!grades[assignment.id]
  })).filter(a => a.hasGrade);

  const averages = {
    daily: calculateWeightedAverage(
      validAssignments.filter(a => a.type === 'Daily').map(a => parseInt(a.grade) || 0),
      validAssignments.filter(a => a.type === 'Daily').map(a => a.type),
      validAssignments.filter(a => a.type === 'Daily').map(a => a.extra)
    ),
    assessment: calculateWeightedAverage(
      validAssignments.filter(a => a.type === 'Assessment').map(a => parseInt(a.grade) || 0),
      validAssignments.filter(a => a.type === 'Assessment').map(a => a.type),
      validAssignments.filter(a => a.type === 'Assessment').map(a => a.extra)
    )
  };

  const finalAverage = Math.round((averages.daily * 0.8) + (averages.assessment * 0.2));

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <Alert className="flex-1 bg-yellow-50 border-yellow-200">
          <Info className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-base font-medium text-yellow-800">
            👋 Welcome! This dashboard is in development. Please verify your grades with me as features are being added.
          </AlertDescription>
        </Alert>
        <SignOutButton />
      </div>
      {/* Color Toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="color-mode"
          checked={showColors}
          onCheckedChange={setShowColors}
        />
        <Label htmlFor="color-mode">Show Assignment Type Colors</Label>
      </div>

      {/* Updated Header Cards with Gradients */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={cn(
          "transition-colors",
          showColors && "bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border-blue-200 hover:shadow-md"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averages.daily}%</div>
            <p className="text-xs text-muted-foreground">
              {validAssignments.filter(a => a.type === 'Daily').length} assignments
            </p>
          </CardContent>
        </Card>
        <Card className={cn(
          "transition-colors",
          showColors && "bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 border-purple-200 hover:shadow-md"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Test Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averages.assessment}%</div>
            <p className="text-xs text-muted-foreground">
              {validAssignments.filter(a => a.type === 'Assessment').length} assignments
            </p>
          </CardContent>
        </Card>
        <Card className={cn(
          "transition-colors",
          showColors && "bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 border-emerald-200 hover:shadow-md"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Final Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finalAverage}%</div>
            <p className="text-xs text-muted-foreground">
              80% Daily / 20% Tests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assignment List */}
      <div className="space-y-4">
        {assignments.map(assignment => {
          const grade = grades[assignment.id];
          const status = getAssignmentStatus(assignment, grade);
          const extraPoint = extraPoints[assignment.id];
          const total = calculateTotal(grades[assignment.id], extraPoints[assignment.id] || '0');
          const assignmentTags = tags.filter(t => t.assignment_id === assignment.id);
          const isExpanded = expandedAssignments.has(assignment.id);

          return (
            <Collapsible
              key={assignment.id}
              open={isExpanded}
              onOpenChange={(open) => {
                setExpandedAssignments(prev => {
                  const next = new Set(prev);
                  if (open) {
                    next.add(assignment.id);
                  } else {
                    next.delete(assignment.id);
                  }
                  return next;
                });
              }}
            >
              <Card className={cn(
                "transition-colors",
                showColors && assignment.type === 'Daily' && "bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-100 border-blue-200 hover:shadow-md",
                showColors && assignment.type === 'Assessment' && "bg-gradient-to-r from-purple-50 via-pink-50 to-purple-100 border-purple-200 hover:shadow-md"
              )}>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <ChevronRight className={cn(
                          "h-4 w-4 transition-transform",
                          isExpanded && "transform rotate-90"
                        )} />
                        <div>
                          <CardTitle className="text-lg">{assignment.name}</CardTitle>
                          <div className="text-sm text-muted-foreground">
                            {format(assignment.date, 'PPP')} · {assignment.type}
                          </div>
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
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Assignment details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Due Date</p>
                        <p className="font-medium">{format(assignment.date, 'PPP')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Subject</p>
                        <p className="font-medium">{assignment.subject}</p>
                      </div>
                    </div>

                    {/* Tags */}
                    {assignmentTags.length > 0 && (
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
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
