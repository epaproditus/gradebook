'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { type Database } from '@/types/supabase';
import Draggable from 'react-draggable'; // remains the same
import { Button } from "@/components/ui/button";
import * as Card from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  name: string;
  averageGrade: number;
}

interface Props {
  students: Student[];
  rows: number;
  cols: number;
  selectedPeriod: string;
}

interface SeatPosition {
  x: number;
  y: number;
}

interface SeatItem {
  id: string;
  studentId: string | null;
  position: SeatPosition;  // Changed from number to x/y coordinates
}

const getGradeColor = (grade: number): string => {
  if (grade >= 90) return 'bg-green-100';
  if (grade >= 80) return 'bg-blue-100';
  if (grade >= 70) return 'bg-yellow-100';
  return 'bg-red-100';
};

const DraggableSeat: React.FC<DraggableSeatProps> = ({ seat, index, renderSeat, onStop }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  return (
    <Draggable
      nodeRef={nodeRef}
      position={seat.position}
      onStop={(e, data) => onStop(e, data, index)}
    >
      <div ref={nodeRef} style={{ position: 'absolute' }}>
        {renderSeat(seat)}
      </div>
    </Draggable>
  );
};

const SeatingArrangement: React.FC<Props> = ({ students, rows = 5, cols = 6, selectedPeriod }) => {
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [arrangementType, setArrangementType] = useState<'homogeneous' | 'heterogeneous'>('homogeneous');
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClientComponentClient<Database>();
  const studentsMap = new Map(students.map(s => [s.id, s]));

  useEffect(() => {
    // Initialize seats in a more spread out arrangement
    const initialSeats: SeatItem[] = Array(rows * cols).fill(null).map((_, index) => ({
      id: crypto.randomUUID(),
      studentId: null,
      position: {
        x: (index % cols) * 150,  // Space seats out horizontally
        y: Math.floor(index / cols) * 150  // Space seats out vertically
      }
    }));
    setSeats(initialSeats);
  }, [rows, cols]);

  useEffect(() => {
    const loadLayout = async () => {
      try {
        console.log('Loading layout for period:', selectedPeriod); // Debug log

        // Sanitize the period value - remove spaces and special characters
        const sanitizedPeriod = selectedPeriod.replace(/[^a-zA-Z0-9]/g, '_');
        
        const { data, error } = await supabase
          .from('seating_layouts')
          .select('layout')
          .eq('period', sanitizedPeriod)
          .maybeSingle();

        console.log('Load response:', { data, error }); // Debug log

        if (error) {
          console.error('Error loading layout:', error);
          return;
        }

        if (data?.layout) {
          setSeats(data.layout.seats);
          setArrangementType(data.layout.type);
        }
      } catch (error) {
        console.error('Error in loadLayout:', error);
      }
    };

    if (selectedPeriod) {
      loadLayout();
    }
  }, [selectedPeriod, supabase]);

  const calculateArrangement = (type: 'homogeneous' | 'heterogeneous') => {
    const sortedStudents = [...students].sort((a, b) => {
      if (type === 'homogeneous') {
        return b.averageGrade - a.averageGrade;
      }
      return students.indexOf(a) % 2 === 0 
        ? b.averageGrade - a.averageGrade 
        : a.averageGrade - b.averageGrade;
    });

    const newSeats = Array(rows * cols).fill(null).map((_, index) => ({
      id: `seat-${index}`,
      studentId: index < sortedStudents.length ? sortedStudents[index].id : null,
      position: {
        x: (index % cols) * 150,  // Space seats out horizontally
        y: Math.floor(index / cols) * 150  // Space seats out vertically
      }
    }));
    setSeats(newSeats);
  };

  const saveLayout = async () => {
    try {
      setIsSaving(true);
      
      const layoutData = {
        period: selectedPeriod,
        layout: {
          type: arrangementType,
          seats: seats.map(seat => ({
            id: seat.id,
            studentId: seat.studentId, // Preserve student assignments
            position: seat.position
          }))
        }
      };

      console.log('Saving layout:', layoutData);

      const { error } = await supabase
        .from('seating_layouts')
        .upsert(layoutData, {
          onConflict: 'period',
          target: ['period']  // Explicitly specify the conflict target
        });

      if (error) {
        console.error('Save error:', error);
        alert('Failed to save layout');
        return;
      }

      alert('Layout saved successfully!');
    } catch (error) {
      console.error('Error saving layout:', error);
      alert('Failed to save layout');
    } finally {
      setIsSaving(false);
    }
  };

  // onStop handler updates seat position in state
  const handleDragStop = (e: any, data: { x: number; y: number }, index: number) => {
    const newSeats = [...seats];
    newSeats[index] = { ...newSeats[index], position: { x: data.x, y: data.y } };
    setSeats(newSeats);
  };

  const renderSeat = (seat: SeatItem) => {
    const student = seat.studentId ? studentsMap.get(seat.studentId) : null;

    return (
      <Card.Card key={seat.id} className="h-24 w-24">
        <div className="w-full h-full flex items-center justify-center">
            {student ? (
            <TooltipProvider>
              <Tooltip>
              <TooltipTrigger className="w-full h-full">
                <div className={`w-full h-full p-2 rounded ${getGradeColor(student.averageGrade)}`}>
                <div className="text-sm font-medium">{student.name}</div>
                <div className="text-xs opacity-75">{student.averageGrade.toFixed(1)}%</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{student.name}</p>
                <p className="text-sm">Average: {student.averageGrade.toFixed(1)}%</p>
              </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            ) : (
            <div className="text-gray-400 text-sm">Empty</div>
            )}
        </div>
      </Card.Card>
    );
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <Select
            value={arrangementType}
            onValueChange={(value: 'homogeneous' | 'heterogeneous') => setArrangementType(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select arrangement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="homogeneous">Homogeneous</SelectItem>
              <SelectItem value="heterogeneous">Heterogeneous</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => calculateArrangement(arrangementType)}
            variant="default"
          >
            Generate Arrangement
          </Button>
        </div>

        <Button
          onClick={saveLayout}
          variant="outline"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Layout'}
        </Button>
      </div>

      <div className="relative w-full h-[600px] border rounded-lg bg-secondary/20" style={{ minWidth: cols * 200 }}>
        {seats.map((seat, index) => (
          <DraggableSeat 
            key={seat.id}
            seat={seat}
            index={index}
            renderSeat={renderSeat}
            onStop={handleDragStop}
          />
        ))}
      </div>
    </div>
  );
};

export default SeatingArrangement;
