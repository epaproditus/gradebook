'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { CourseCard } from '@/components/CourseCard';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import { CourseSetupDialog } from '@/components/CourseSetupDialog';

interface Course {
  id: string;
  name: string;
  section?: string;
}

export default function ClassroomPage() {
  const { data: session, status } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupCourse, setSetupCourse] = useState<{id: string; name: string} | null>(null);

  async function fetchCourses() {
    try {
      if (!session?.accessToken) {
        signIn('google', { callbackUrl: '/classroom' });
        return;
      }

      const res = await fetch('/api/classroom/courses', {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) {
          signIn('google', { callbackUrl: '/classroom' });
          return;
        }
        throw new Error(data.error || 'Failed to load courses');
      }
      
      setCourses(data.courses || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      setLoading(false);
      return;
    }
    fetchCourses();
  }, [session, status]);

  return (
    <div>
      <Navigation />
      <div className="container mx-auto p-6">
        {status === 'loading' ? (
          <div className="flex justify-center items-center min-h-screen">
            <LoadingSpinner />
            <p className="ml-2">Loading session...</p>
          </div>
        ) : status === 'unauthenticated' ? (
          <div className="flex justify-center items-center min-h-screen">
            <p>Please sign in to view courses</p>
            <Button onClick={() => signIn('google')} className="ml-4">
              Sign in with Google
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-6">Google Classroom Courses</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card key={course.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{course.name}</h3>
                      {course.section && (
                        <p className="text-sm text-gray-500">{course.section}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSetupCourse({ id: course.id, name: course.name })}
                    >
                      Setup Course
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {setupCourse && (
              <CourseSetupDialog
                courseId={setupCourse.id}
                courseName={setupCourse.name}
                open={true}
                onClose={() => setSetupCourse(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
