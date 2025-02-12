import { CourseCard } from './CourseCard';

interface Course {
  id: string;
  name: string;
  section?: string;
}

export default function CourseGrid({ courses }: { courses: Course[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {courses.map((course: Course) => (
        <CourseCard 
          key={course.id}
          {...course}
          onSync={async (courseId: string): Promise<void> => {
            // Will implement sync logic later
            console.log('Syncing course:', courseId);
          }}
        />
      ))}
    </div>
  );
}
