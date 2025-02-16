'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createPortal } from 'react-dom';

interface PeriodSelectPortalProps {
  isOpen: boolean;
  onClose: () => void;
  periods: string[];
  selectedPeriods: string[];
  onPeriodToggle: (period: string) => void;
  triggerRef: React.RefObject<HTMLElement>;
}

export function PeriodSelectPortal({
  isOpen,
  onClose,
  periods,
  selectedPeriods,
  onPeriodToggle,
  triggerRef,
}: PeriodSelectPortalProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        portalRef.current && 
        !portalRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <Card
      ref={portalRef}
      className="fixed z-50 min-w-[140px] p-2 shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="space-y-2">
        {periods.map(periodId => (
          <div
            key={periodId}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onPeriodToggle(periodId);
            }}
          >
            <Checkbox 
              checked={selectedPeriods.includes(periodId)}
              className="pointer-events-none"
            />
            <span>Period {periodId}</span>
          </div>
        ))}
      </div>
      <div className="border-t mt-2 pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={onClose}
        >
          Done
        </Button>
      </div>
    </Card>,
    document.body
  );
}
