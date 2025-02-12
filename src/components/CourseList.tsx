import { useState } from 'react';
import { Course } from '@/types/classroom';
import { CourseSetupDialog } from './CourseSetupDialog';
import LoadingSpinner from './ui/loading-spinner';

interface CourseListProps {
  courses: Course[];
  isLoading: boolean;
}

export function CourseList({ courses, isLoading }: CourseListProps) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (!courses.length) {
    return (
      <div className="text-center p-4">
        <p>No courses found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <div key={course.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">{course.name}</h3>
              <p className="text-sm text-gray-500">{course.section}</p>
            </div>
            <button
              onClick={() => setSelectedCourse(course)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Setup
            </button>
          </div>
        </div>
      ))}

      {selectedCourse && (
        <CourseSetupDialog
          courseId={selectedCourse.id}
          courseName={selectedCourse.name}
          open={!!selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </div>
  );
}
