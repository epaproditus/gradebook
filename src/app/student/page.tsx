import { StudentDashboard } from '@/components/StudentDashboard';

// Add debug logging to see student data as it's loaded:

console.log('Loading student data:', {
  students,
  selectedPeriod,
  rawStudentsData 
});

export default function StudentPage() {
  return <StudentDashboard />;
}
