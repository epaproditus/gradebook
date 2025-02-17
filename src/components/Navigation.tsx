'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUserRole } from '@/lib/auth';

export function Navigation() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    getUserRole().then(setUserRole);
  }, []);

  // Only show student links for students
  if (userRole === 'student') {
    return (
      <nav className="flex items-center space-x-4 h-14">
        <Link
          href="/student"
          className={pathname === '/student' ? 'font-bold' : ''}
        >
          My Grades
        </Link>
      </nav>
    );
  }

  // Show teacher links for teachers
  if (userRole === 'teacher') {
    return (
      <nav className="flex items-center space-x-4 h-14">
        <Link
          href="/gradebook"
          className={pathname === '/gradebook' ? 'font-bold' : ''}
        >
          Gradebook
        </Link>
        <Link
          href="/classroom"
          className={pathname === '/classroom' ? 'font-bold' : ''}
        >
          Google Classroom
        </Link>
      </nav>
    );
  }

  return null;
}
