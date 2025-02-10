'use client';

import dynamic from 'next/dynamic';

const GradeBook = dynamic(() => import('@/components/GradeBook'), { ssr: false });

export default function Home() {
    return <GradeBook />;
}
