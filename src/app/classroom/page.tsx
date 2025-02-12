'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { CourseCard } from '@/components/CourseCard';

interface Course {
  id: string;
  name: string;
  section?: string;
}

export default function ClassroomPage() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await fetch('/api/classroom/courses', {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`
          }
        });
        const data = await res.json();
        
        if (res.ok) {
          setCourses(data.courses || []);
        } else {
          setError(data.error || 'Failed to load courses');
        }
      } catch (e) {
        setError('Failed to load courses');
      } finally {
        setLoading(false);
      }
    }

    if (session?.accessToken) {
      fetchCourses();
    }
  }, [session]);

  const handleSync = async (courseId: string) => {
    try {
      const res = await fetch(`/api/classroom/${courseId}/assignments`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to sync');
      // Optionally show success message
    } catch (e) {
      console.error('Sync failed:', e);
    }
  };

  if (loading) return <div>Loading courses...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!session) return <div>Please sign in to view courses</div>;

  return (
    <div className="container mx-auto p-6">
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
    </div>
  );
}
