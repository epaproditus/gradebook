'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { CourseCard } from '@/components/CourseCard';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import type { Course } from '@/types/classroom';

export default function ClassroomPage() {
  const { data: session, status } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      if (status === 'loading' || !session?.accessToken) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching courses...');
        const res = await fetch('/api/classroom/courses', {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        });

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch courses');
        }

        console.log('Courses fetched:', data);
        setCourses(data.courses || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch courses');
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, [session?.accessToken, status]);

  if (status === 'unauthenticated') {
    return (
      <div className="p-6 flex flex-col items-center gap-4">
        <p className="text-gray-600">Please sign in to access Google Classroom.</p>
        <Button 
          onClick={() => signIn('google')}
          size="lg"
          className="gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </Button>
      </div>
    );
  }

  if (loading || status === 'loading') {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner className="w-6 h-6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <p>Error loading courses: {error}</p>
      </div>
    );
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6">Google Classroom</h1>
      {courses.length === 0 ? (
        <p className="text-gray-600">No courses found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <CourseCard 
              key={course.id} 
              course={course}
              onSetupClick={(updatedCourse) => {
                setCourses(current => 
                  current.map(c => 
                    c.id === updatedCourse.id ? updatedCourse : c
                  )
                );
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
