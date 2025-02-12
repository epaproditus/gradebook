'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { CourseCard } from '@/components/CourseCard';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';

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

  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);

    async function fetchCourses() {
      try {
        console.log('Fetching courses with token:', session?.accessToken);
        const res = await fetch('/api/classroom/courses', {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`
          }
        });
        const data = await res.json();
        console.log('Courses response:', data);
        
        if (res.ok) {
          setCourses(data.courses || []);
        } else {
          setError(data.error || 'Failed to load courses');
          console.error('Failed to load courses:', data.error);
        }
      } catch (e) {
        console.error('Error fetching courses:', e);
        setError('Failed to load courses');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'loading') {
      return; // Don't do anything while loading
    }

    if (!session) {
      setLoading(false); // Stop loading if not authenticated
      return;
    }

    fetchCourses();
  }, [session, status]);

  async function handleSync(courseId: string): Promise<void> {
    try {
      const res = await fetch(`/api/classroom/courses/${courseId}/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.accessToken}`
        }
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to sync course');
      }
    } catch (error) {
      console.error('Error syncing course:', error);
      setError('Failed to sync course');
    }
  }

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
                <CourseCard
                  key={course.id}
                  {...course}
                  onSync={handleSync}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
