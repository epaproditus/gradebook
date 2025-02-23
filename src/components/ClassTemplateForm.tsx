'use client';

import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { type Database } from '@/types/supabase';
import { Button } from "@/components/ui/button";
import * as Card from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';

interface SeatPosition {
  x: number;
  y: number;
}

interface SeatItem {
  id: string;
  label: string;
  position: SeatPosition;
}

interface DraggableSeatProps {
  seat: SeatItem;
  index: number;
  onStop: (e: any, data: { x: number; y: number }, index: number) => void;
}

const DraggableSeat: React.FC<DraggableSeatProps> = ({ seat, index, onStop }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  return (
    <Draggable
      nodeRef={nodeRef}
      position={seat.position}
      onStop={(e, data) => onStop(e, data, index)}
    >
      <div ref={nodeRef} style={{ position: 'absolute' }}>
        <Card.Card className="h-24 w-24 flex items-center justify-center">
          <span className="text-lg font-medium">{seat.label}</span>
        </Card.Card>
      </div>
    </Draggable>
  );
};

export const ClassTemplateForm: React.FC = () => {
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClientComponentClient<Database>();

  // Define grid dimensions (can be adjustable as needed)
  const rows = 5, cols = 6;

  // Initialize seats with labeled desk numbers
  useEffect(() => {
    const initialSeats: SeatItem[] = Array(rows * cols).fill(null).map((_, index) => ({
      id: crypto.randomUUID(),
      label: `Desk ${index + 1}`,
      position: {
        x: (index % cols) * 150,   // space desks horizontally
        y: Math.floor(index / cols) * 150  // space desks vertically
      }
    }));
    setSeats(initialSeats);
  }, [rows, cols]);

  const handleDragStop = (e: any, data: { x: number; y: number }, index: number) => {
    const newSeats = [...seats];
    newSeats[index] = { ...newSeats[index], position: { x: data.x, y: data.y } };
    setSeats(newSeats);
  };

  // Save the template using a fixed period "template"
  const saveTemplate = async () => {
    try {
      setIsSaving(true);
      await supabase
        .from('seating_layouts')
        .upsert({
          period: 'template',
          layout: JSON.stringify({ seats, type: 'template' }),
          updated_at: new Date().toISOString()
        });
      alert("Class template saved!");
    } catch (error) {
      console.error('Error saving class template:', error);
      alert("Error saving template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Class Template Setup</h2>
      <div className="mb-4">
        <p>Arrange the desks as desired. Labels indicate default desk numbers.</p>
      </div>
      <div className="relative w-full h-[600px] border rounded-lg bg-secondary/20" style={{ minWidth: cols * 200 }}>
        {seats.map((seat, index) => (
          <DraggableSeat 
            key={seat.id}
            seat={seat}
            index={index}
            onStop={handleDragStop}
          />
        ))}
      </div>
      <div className="mt-4">
        <Button onClick={saveTemplate} disabled={isSaving}>
          {isSaving ? "Saving Template..." : "Save Template"}
        </Button>
      </div>
    </div>
  );
};
