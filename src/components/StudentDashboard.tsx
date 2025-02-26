'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Assignment } from '@/types/gradebook';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Flag, 
  Clock, 
  Award, 
  Target, 
  Zap, 
  ChevronRight,
  BookOpen,
  Brain,
  GraduationCap,
  Info
} from 'lucide-react';
import { 
  calculateDailyPoints, 
  calculateAssessmentPoints, 
  calculateTotal, 
  calculateStudentAverage 
} from '@/lib/gradeCalculations';
import { SignOutButton } from './SignOutButton';
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatGradeDisplay, getGradeDisplayClass } from '@/lib/displayFormatters';
import { Button } from "@/components/ui/button";  // Add this
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";  // Add this
import { GradeBar } from './GradeBar';
import { AvatarPicker } from './AvatarPicker';
import { BenchmarkScores } from './BenchmarkScores';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SixWeeksSelector } from './SixWeeksSelector';
import { getCurrentSixWeeks } from '@/lib/dateUtils';

interface StudentData {
  id: number;
  name: string;
  period: string;
  google_email: string;
  avatar_options?: string;
}

interface GradeWithTimestamp {
  grade: string;
  updated_at: string;
}

export function StudentDashboard() {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [extraPoints, setExtraPoints] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<any[]>([]);
  const [expandedAssignments, setExpandedAssignments] = useState<Set<string>>(new Set());
  const [showColors, setShowColors] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [recentlyFlagged, setRecentlyFlagged] = useState<Set<string>>(new Set());
  const [currentSixWeeks, setCurrentSixWeeks] = useState<string>(getCurrentSixWeeks());
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });

  const { toast } = useToast();

  const formatName = (name: string) => {
    // Assuming name comes as "Last, First"
    const [last, first] = name.split(',').map(part => part.trim());
    return `${first} ${last}`;
  };

  const formatPeriod = (period: string) => {
    const num = parseInt(period);
    const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
    return `${num}${suffix} Period`;
  };

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
            .eq('six_weeks_period', currentSixWeeks)
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
              .eq('student_id', studentData.student_id)
              .order('created_at', { ascending: false });

            if (gradeData) {
              const gradeMap: Record<string, string> = {};
              const extraPointsMap: Record<string, string> = {};
              
              // Get the most recent creation date
              const mostRecent = gradeData[0]?.created_at;
              if (mostRecent) {
                setLastUpdated(new Date(mostRecent));
              }

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

            // Get messages for these assignments
            const { data: messageData } = await supabase
              .from('messages')
              .select('*')
              .eq('student_id', studentData.student_id);

            if (messageData) {
              setMessages(messageData);
            }
          }
        }
      }
    };

    loadStudentData();
  }, [currentSixWeeks]);

  const handleFlag = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('assignment_flags')
        .insert({
          assignment_id: assignmentId,
          student_id: student?.id,
          type: 'needs_review',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Show temporary feedback
      setRecentlyFlagged(prev => new Set(prev).add(assignmentId));
      
      toast({
        title: "Assignment Flagged",
        description: "Your teacher will review this assignment.",
      });

      // Remove the "recently flagged" status after 2 seconds
      setTimeout(() => {
        setRecentlyFlagged(prev => {
          const next = new Set(prev);
          next.delete(assignmentId);
          return next;
        });
      }, 2000);

    } catch (error) {
      console.error('Error flagging assignment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Couldn't flag assignment. Please try again."
      });
    }
  };

  // 1. Gets the grade value from either saved grades or temp storage
  const getAssignmentStatus = (assignment: Assignment, grade?: string) => {
    if (!grade) return 'not_started';
    const total = calculateTotal(grades[assignment.id], extraPoints[assignment.id] || '0');
    if (assignment.type === 'Assessment' && total < 70) return 'needs_retest';
    return 'completed';
  };

  // 2. The actual grade display is handled here
  const getAssignmentDisplay = (assignment: Assignment) => {
    const grade = parseInt(grades[assignment.id] || '0');
    const extra = parseInt(extraPoints[assignment.id] || '0'); // Simplified key for student view
    
    if (grade === 0 && extra === 0) {
      return <span className="text-muted-foreground italic">-</span>;
    }

    return (
      <div className="w-full">
        <GradeBar 
          initialGrade={grade} 
          extraPoints={extra}
        />
      </div>
    );
  };

  const calculatePercentage = (value: number, total: number) => {
    return (value / total) * 100;
  };

  const getProgressColor = (score: number, type: 'overall' | 'daily' | 'test' = 'overall') => {
    if (score >= 90) return 'stroke-emerald-500';
    if (score >= 70) return 'stroke-yellow-500';
    if (score >= 50) return 'stroke-orange-500';
    return 'stroke-red-500';
  };

  // Update the circle calculations for proper stroke length
  const calculateCircleStroke = (percentage: number, radius: number) => {
    const normalizedPercentage = Math.min(100, Math.max(0, percentage));
    const circumference = 2 * Math.PI * radius;
    const strokeLength = (normalizedPercentage / 100) * circumference;
    return `${strokeLength} ${circumference}`;
  };

  // Add assignment toggle function
  const toggleAssignment = (assignmentId: string) => {
    setExpandedAssignments(prev => {
      const next = new Set(prev);
      if (next.has(assignmentId)) {
        next.delete(assignmentId);
      } else {
        next.add(assignmentId);
      }
      return next;
    });
  };

  // Update circle calculations to show both background and progress circles
  const getCircleStyles = (percentage: number, radius: number) => {
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = ((100 - percentage) / 100) * circumference;
    return {
      strokeDasharray: `${circumference} ${circumference}`,
      strokeDashoffset: strokeDashoffset
    };
  };

  const handleAvatarSave = async (avatarOptions: any) => {
    if (!student) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .update({ 
          avatar_options: JSON.stringify(avatarOptions) 
        })
        .eq('id', student.id);

      if (error) throw error;

      setStudent(prev => prev ? {
        ...prev,
        avatar_options: JSON.stringify(avatarOptions)
      } : null);

      toast({
        title: "Avatar Updated",
        description: "Your avatar has been saved!"
      });
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update avatar"
      });
    }
  };

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading...
      </div>
    );
  }

  // 3. Filter assignments and only include those that are completed or in progress
  const validAssignments = assignments
    .filter(assignment => 
      assignment.status === 'completed' || 
      assignment.status === 'in_progress'
    )
    .map(assignment => ({
      grade: grades[assignment.id] || '0',
      extra: extraPoints[assignment.id] || '0',
      type: assignment.type
    }));

  // 4. Uses the standardized calculation from gradeCalculations.ts
  const totalGrade = calculateStudentAverage(validAssignments);

  // For the cards display, we can still show the breakdown
  const dailyPoints = calculateDailyPoints(validAssignments);
  const assessmentPoints = calculateAssessmentPoints(validAssignments);

  console.log('Grade breakdown:', { 
    dailyPoints,
    assessmentPoints,
    totalGrade,
    assignments: validAssignments
  });

  return (
    <div className="fixed inset-0 bg-black overflow-auto">
      <div className="min-h-screen bg-black text-white pt-16 sm:pt-20 pb-16 sm:pb-20">
        {/* Floating Navigation */}
        <div className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 flex gap-2 sm:gap-4">
          <SignOutButton variant="dark" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-6">
          {/* Side Stats Panel */}
          <div className="lg:col-span-3 bg-zinc-900 p-4 sm:p-6 relative h-fit lg:sticky lg:top-24">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <AvatarPicker
                  currentAvatar={student?.avatar_options || ''}
                  onSave={handleAvatarSave}
                />
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">
                    {student?.name ? formatName(student.name) : ''}
                  </h1>
                  <p className="text-zinc-400">
                    {student?.period ? formatPeriod(student.period) : ''}
                  </p>
                </div>
              </div>

              {/* Update the Overall Grade Circle */}
              <div className="relative w-48 h-48 mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    className="stroke-zinc-800 fill-none"
                    strokeWidth="8"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    className={`${getProgressColor(totalGrade)} stroke-current fill-none transition-all duration-1000`}
                    strokeWidth="8"
                    {...getCircleStyles(totalGrade, 88)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                  <span className="text-5xl font-bold">{totalGrade}%</span>
                  <p className="text-sm text-zinc-400 mt-1">Overall Grade</p>
                </div>
              </div>

              {/* Quick Stats with Percentage Circles */}
              <div className="grid grid-cols-2 gap-4">
                {/* Daily Work Circle */}
                <div className="bg-zinc-800 rounded-xl p-4">
                  <div className="relative w-24 h-24 mx-auto mb-2">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        className="stroke-zinc-700 fill-none"
                        strokeWidth="6"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        className={`${getProgressColor(calculatePercentage(dailyPoints, 80), 'daily')} stroke-current fill-none transition-all duration-1000`}
                        strokeWidth="6"
                        {...getCircleStyles(calculatePercentage(dailyPoints, 80), 44)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                      <span className="text-2xl font-bold">{Math.round(calculatePercentage(dailyPoints, 80))}%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-zinc-400">Daily Work</div>
                    <div className="text-sm font-medium">{dailyPoints}/80</div>
                  </div>
                </div>

                {/* Tests Circle */}
                <div className="bg-zinc-800 rounded-xl p-4">
                  <div className="relative w-24 h-24 mx-auto mb-2">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        className="stroke-zinc-700 fill-none"
                        strokeWidth="6"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        className={`${getProgressColor(
                          // Only show actual assessment percentage, not assumed 100%
                          assignments.filter(a => a.type === 'Assessment').length > 0 
                            ? calculatePercentage(assessmentPoints, 20)
                            : 0,
                          'test'
                        )} stroke-current fill-none transition-all duration-1000`}
                        strokeWidth="6"
                        {...getCircleStyles(
                          // Use 0 for circle display when no assessments
                          assignments.filter(a => a.type === 'Assessment').length > 0 
                            ? calculatePercentage(assessmentPoints, 20)
                            : 0, 
                          44
                        )}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                      <span className="text-2xl font-bold">
                        {/* Show 0% when no assessments */}
                        {assignments.filter(a => a.type === 'Assessment').length > 0 
                          ? Math.round(calculatePercentage(assessmentPoints, 20))
                          : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-zinc-400">Tests</div>
                    <div className="text-sm font-medium">{assessmentPoints}/20</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            <Tabs defaultValue="assignments" className="space-y-4">
              {/* Make tab list scrollable on mobile */}
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <TabsList className="bg-zinc-900 border-zinc-800 w-auto inline-flex min-w-full sm:min-w-0">
                  <TabsTrigger 
                    value="assignments"
                    className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                  >
                    Assignments
                  </TabsTrigger>
                  <TabsTrigger 
                    value="benchmarks"
                    className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
                  >
                    Benchmark Scores
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="assignments" className="space-y-4">
                {/* Add Six Weeks selector */}
                <div className="mb-6">
                  <SixWeeksSelector
                    value={currentSixWeeks}
                    onChange={(value) => setCurrentSixWeeks(value || getCurrentSixWeeks())}
                  />
                </div>
                {/* Make assignment grid responsive */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments.map((assignment, index) => (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group h-full" // Added h-full
                    >
                      <div 
                        className="bg-zinc-900 rounded-2xl p-6 hover:bg-zinc-800 transition-all duration-300 cursor-pointer h-full flex flex-col"
                        onClick={() => toggleAssignment(assignment.id)}
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "h-2 w-2 rounded-full",
                                assignment.status === 'completed' ? "bg-green-500" :
                                assignment.status === 'in_progress' ? "bg-blue-500" :
                                "bg-orange-500"  // Not yet graded
                              )} />
                              <div>
                                <h3 className="text-lg font-semibold">{assignment.name}</h3>
                                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                  <Calendar className="w-3 h-3" />
                                  <span>{format(assignment.date, 'MMM d')}</span>
                                  {assignment.status !== 'completed' && (
                                    <span className="text-orange-500">(Not Yet Graded)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-auto">
                            {grades[assignment.id] && (
                              <div className="flex-1 mr-4"> {/* Added flex-1 and margin */}
                                {getAssignmentDisplay(assignment)}
                              </div>
                            )}
                            <ChevronRight className={cn(
                              "w-4 h-4 shrink-0 transition-transform", // Added shrink-0
                              expandedAssignments.has(assignment.id) && "transform rotate-90"
                            )} />
                          </div>
                          {expandedAssignments.has(assignment.id) && (
                            <div className="mt-4 pt-4 border-t border-zinc-800">
                              <div className="flex justify-end">
                                {recentlyFlagged.has(assignment.id) ? (
                                  <span className="text-sm text-zinc-400">
                                    Flagged for review
                                  </span>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFlag(assignment.id);
                                    }}
                                    className="text-zinc-400 hover:text-white"
                                  >
                                    <Flag className="h-4 w-4 mr-2" />
                                    Flag for review
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="benchmarks">
                <BenchmarkScores studentId={student?.id || 0} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Last Updated Indicator */}
        {lastUpdated && (
          <div className="fixed bottom-4 sm:bottom-6 left-4 sm:left-6 flex items-center gap-2 text-zinc-500 text-xs sm:text-sm">
            <Clock className="w-4 h-4" />
            <span>Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

