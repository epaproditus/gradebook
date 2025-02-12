'use client';

import dynamic from 'next/dynamic';

// Explicitly specify the default import
const GradeBook = dynamic(
  () => import('./GradeBook').then(mod => mod.default),
  { ssr: false }
);

export default function GradebookWrapper() {
  return <GradeBook />;
}
