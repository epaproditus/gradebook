'use client';

import { FC, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { signIn, useSession } from 'next-auth/react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SignOutButton } from './SignOutButton';

interface ClassworkItem {
  id: string;
  title: string;
  description: string;
  creationTime: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  maxPoints?: number;
  submissions?: {
    [studentId: string]: {
      assignedGrade?: number;
      draftGrade?: number;
    };
  };
}

interface Course {
  id: string;
  name: string;
  section?: string;
}

const GoogleClassroom: FC = () => {
  const { data: session, status } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');  // Add this
  const [classwork, setClasswork] = useState<ClassworkItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [syncInProgress, setSyncInProgress] = useState(false);

  const supabase = createClientComponentClient(); // Add this

  // Add this function to handle period selection
  const handlePeriodSelect = async (period: string) => {
    try {
      setSelectedPeriod(period);
      
      if (!selectedCourse) return;

      // Update or create course mapping in database
      const { error } = await supabase
        .from('course_mappings')
        .upsert({
          course_id: selectedCourse,
          period: period,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'course_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Course mapped to Period ${period}`
      });

    } catch (error) {
      console.error('Error saving period mapping:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save period mapping"
      });
    }
  };

  // Add effect to load existing mapping when course is selected
  useEffect(() => {
    const loadPeriodMapping = async () => {
      if (!selectedCourse) return;

      try {
        const { data, error } = await supabase
          .from('course_mappings')
          .select('period')
          .eq('course_id', selectedCourse)
          .single();

        if (error) throw error;
        if (data) setSelectedPeriod(data.period);

      } catch (error) {
        console.error('Error loading period mapping:', error);
      }
    };

    loadPeriodMapping();
  }, [selectedCourse]);

  useEffect(() => {
    if (session) {
      fetchCourses();
    }
  }, [session]);

  const fetchCourses = async () => {
    if (!session?.accessToken) {
      console.error('Access token missing');
      return;
    }
    console.log('Using access token:', session.accessToken);
    try {
      const response = await fetch('/api/classroom/courses', {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      const data = await response.json();
      console.log('Fetched courses data:', data);
      if (Array.isArray(data.courses) && data.courses.length > 0) {
        setCourses(data.courses);
      } else {
        console.warn("No courses found. Check the API response.");
        setCourses([]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchClasswork = async (courseId: string) => {
    if (!session?.accessToken) {
      console.error('Access token missing when fetching classwork');
      return;
    }
    console.log('Fetching classwork for course:', courseId);
    try {
      const response = await fetch(`/api/classroom?courseId=${courseId}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      const data = await response.json();
      console.log('Fetched classwork data:', data);
      if (data.courseWork) {
        setClasswork(data.courseWork);
      }
    } catch (error) {
      console.error('Error fetching classwork:', error);
    }
  };

  // Add this new function to check scopes
  const checkRequiredScopes = (accessToken: string): Promise<boolean> => {
    return fetch('/api/classroom/verify-scopes', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    .then(res => res.json())
    .then(data => data.hasRequiredScopes)
    .catch(() => false);
  };

  useEffect(() => {
    const initializeClassroom = async () => {
      if (status === "authenticated" && session?.accessToken) {
        const hasScopes = await checkRequiredScopes(session.accessToken as string);
        if (!hasScopes) {
          toast({
            variant: "destructive",
            title: "Access Error",
            description: "Additional Google Classroom permissions are required. Please sign out and sign in again."
          });
          return;
        }
        fetchCourses();
      }
    };

    initializeClassroom();
  }, [status, session]);

  // Replace the handleAuth function with this:
  const handleAuth = async () => {
    if (!session) {
      // Use the signIn function with specific scopes if needed
      await signIn('google', {
        callbackUrl: window.location.href,
      });
    }
  };

  const toggleItem = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  useEffect(() => {
    if (session?.accessToken && selectedCourse) {
      fetchClasswork(selectedCourse);
    }
  }, [session, selectedCourse]);

  // Update the render logic
  if (status === "loading") {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header with Sign Out */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Google Classroom</h2>
        <div className="self-end sm:self-auto">
          <SignOutButton />
        </div>
      </div>

      {!session ? (
        <Button onClick={handleAuth}>
          Connect Google Classroom
        </Button>
      ) : (
        <div className="space-y-6">
          {/* Controls Section */}
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap items-start">
            <div className="w-full sm:w-auto min-w-[200px]">
              <Select
                value={selectedPeriod}
                onValueChange={handlePeriodSelect}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select period..." />
                </SelectTrigger>
                <SelectContent>
                  {['1', '2', '3', '4', '5', '6', '7', '8'].map((period) => (
                    <SelectItem key={period} value={period}>
                      Period {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-auto min-w-[300px]">
              <Select
                value={selectedCourse || ''}
                onValueChange={(value: string) => setSelectedCourse(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.length === 0 ? (
                    <p className="p-2 text-sm text-muted-foreground">No courses found.</p>
                  ) : (
                    courses.map((course: Course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} {course.section ? `(${course.section})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => setSyncInProgress(true)}
              disabled={syncInProgress || !selectedCourse}
              className="w-full sm:w-auto"
            >
              Sync Grades
            </Button>
          </div>
          
          {/* Classwork Grid */}
          {selectedCourse && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {classwork.map(item => (
                <Collapsible
                  key={item.id}
                  open={expandedItems[item.id]}
                  onOpenChange={() => toggleItem(item.id)}
                >
                  <Card>
                    <CardHeader>
                      <CollapsibleTrigger className="flex items-center justify-between w-full">
                        <CardTitle className="text-base sm:text-lg line-clamp-2">
                          {item.title}
                        </CardTitle>
                        <ChevronRight 
                          className={`h-4 w-4 shrink-0 transition-transform ${
                            expandedItems[item.id] ? 'rotate-90' : ''
                          }`}
                        />
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="prose max-w-none text-sm sm:text-base">
                          <div dangerouslySetInnerHTML={{ __html: item.description }} />
                        </div>
                        {item.maxPoints !== undefined && (
                          <div className="mt-4">
                            <h4 className="text-lg font-bold">Grades</h4>
                            {/* Add your grades content here */}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleClassroom;