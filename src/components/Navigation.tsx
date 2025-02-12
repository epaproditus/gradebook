'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/gradebook', label: 'Gradebook', match: '/gradebook' },
    { href: '/classroom', label: 'Google Classroom', match: '/classroom' }
  ];

  return (
    <nav className="flex gap-6 border-b">
      {links.map(({ href, label, match }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "px-4 py-3 text-sm font-medium hover:text-primary transition-colors",
            pathname?.startsWith(match) ? "border-b-2 border-primary text-primary" : "text-muted-foreground"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
