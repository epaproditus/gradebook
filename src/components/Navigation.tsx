'use client';

import { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const Navigation: FC = () => {
  const pathname = usePathname();

  return (
    <nav className="border-b">
      <div className="px-6 flex h-14 items-center">
        <div className="flex space-x-4">
          <Link 
            href="/gradebook"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/gradebook" 
                ? "text-foreground" 
                : "text-muted-foreground"
            )}
          >
            Gradebook
          </Link>
          <Link
            href="/classroom"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/classroom"
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            Google Classroom
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
