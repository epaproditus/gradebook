import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Import GradeBook with dynamic import to handle client-side rendering
const GradeBook = dynamic(
  () => import('@/components/GradeBook'),
  { 
    ssr: false,
    loading: () => <div>Loading gradebook...</div>
  }
);

export default function GradebookPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GradeBook />
    </Suspense>
  );
}
