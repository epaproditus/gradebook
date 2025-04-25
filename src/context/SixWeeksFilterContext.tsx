'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { getCurrentSixWeeks } from '@/lib/dateUtils';

interface SixWeeksFilterContextType {
  sixWeeksFilter: string;
  setSixWeeksFilter: (filter: string) => void;
}

const SixWeeksFilterContext = createContext<SixWeeksFilterContextType | undefined>(undefined);

export function SixWeeksFilterProvider({ children }: { children: ReactNode }) {
  const [sixWeeksFilter, setSixWeeksFilter] = useState<string>(getCurrentSixWeeks());

  return (
    <SixWeeksFilterContext.Provider value={{ sixWeeksFilter, setSixWeeksFilter }}>
      {children}
    </SixWeeksFilterContext.Provider>
  );
}

export function useSixWeeksFilter() {
  const context = useContext(SixWeeksFilterContext);
  if (context === undefined) {
    throw new Error('useSixWeeksFilter must be used within a SixWeeksFilterProvider');
  }
  return context;
}
