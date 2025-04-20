'use client';

import { useParams } from 'next/navigation';
import { useStudents } from '@/hooks/useStudents';
import RosterView from '@/components/RosterView';

export default function GradebookPage() {
  const { period } = useParams();
  const { 
    students, 
    loading, 
    error, 
    setStudents 
  } = useStudents(Array.isArray(period) ? period[0] : period);

  // Other state and handlers would go here...

  if (loading) return <div>Loading students...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <RosterView
      students={students}
      setStudents={setStudents}
      deleteStudent={deleteStudent}
      // Pass all other required props...
      activeTab={Array.isArray(period) ? period[0] : period}
      // ...rest of props
    />
  );
}
