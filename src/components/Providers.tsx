'use client';

import { SessionProvider } from 'next-auth/react';

// Change from export function to export const
export const Providers = ({ children }: { children: React.ReactNode }) => {
  return <SessionProvider>{children}</SessionProvider>;
};
