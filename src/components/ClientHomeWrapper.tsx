'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface Props {
  isTeacher: boolean;
}

export default function ClientHomeWrapper({ isTeacher }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (isTeacher) {
      router.replace('/gradebook');
    } else {
      router.replace('/student');
    }
  }, [isTeacher, router]);

  return <div>Redirecting...</div>;
}
