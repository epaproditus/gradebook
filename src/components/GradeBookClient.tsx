'use client';

import dynamic from 'next/dynamic';

const GradeBook = dynamic(
  () => import('./GradeBook'),
  { 
    ssr: false,
    loading: () => <div>Loading gradebook...</div>
  }
);

export default function GradeBookClient() {
  return <GradeBook />;
}
