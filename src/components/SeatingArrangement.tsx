'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { type Database } from '@/types/supabase';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

interface SeatItem {
  id: string;
  studentId: string | null;
  position: number;
}

const SeatingArrangement: React.FC<Props> = ({ students, rows = 5, cols = 6, selectedPeriod }) => {
  const [seats, setSeats] = useState<SeatItem[]>([]);
  const [arrangementType, setArrangementType] = useState<'homogeneous' | 'heterogeneous'>('homogeneous');
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClientComponentClient<Database>();
  const studentsMap = new Map(students.map(s => [s.id, s]));

  useEffect(() => {
    // Initialize empty seats
    const initialSeats: SeatItem[] = Array(rows * cols).fill(null).map((_, index) => ({
      id: `seat-${index}`,
      studentId: null,
      position: index
    }));
    setSeats(initialSeats);
  }, [rows, cols]);

  useEffect(() => {
    const loadLayout = async () => {
      try {
        const { data } = await supabase
          .from('seating_layouts')
          .select('layout')
          .eq('period', selectedPeriod)
          .single();

        if (data?.layout) {
          const savedLayout = JSON.parse(data.layout);
          if (savedLayout.seats) {
            setSeats(savedLayout.seats);
            setArrangementType(savedLayout.type);
          }
        }
      } catch (error) {
        console.error('Error loading layout:', error);
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
      position: index
    }));
    setSeats(newSeats);
  };

  const saveLayout = async () => {
    try {
      setIsSaving(true);
      await supabase
        .from('seating_layouts')
        .upsert({
          period: selectedPeriod,
          layout: JSON.stringify({
            seats,
            type: arrangementType
          }),
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error saving layout:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const sourceIndex = parseInt(source.droppableId.replace('seat-', ''));
    const destIndex = parseInt(destination.droppableId.replace('seat-', ''));

    const newSeats = [...seats];
    const [removed] = newSeats.splice(sourceIndex, 1);
    newSeats.splice(destIndex, 0, removed);

    setSeats(newSeats.map((seat, index) => ({ ...seat, position: index })));
  };

  const renderSeat = (seat: SeatItem) => {
    const student = seat.studentId ? studentsMap.get(seat.studentId) : null;

    return (
      <Card key={seat.id} className="h-24">
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
                  <p className="font-semibold">Grade Details</p>
                  <p className="text-sm">Average: {student.averageGrade.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Drag to move</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="text-gray-400">Empty</div>
          )}
        </div>
      </Card>
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

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable
          droppableId="seating-grid"
          direction="horizontal"
          type="GRID"
        >
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(120px, 1fr))` }}
            >
              {seats.map((seat, index) => (
                <div
                  key={seat.id}
                  data-position={index}
                  className="relative"
                >
                  <Draggable
                    draggableId={seat.id}
                    index={seat.position}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`w-full ${snapshot.isDragging ? 'z-50' : ''}`}
                      >
                        {renderSeat(seat)}
                      </div>
                    )}
                  </Draggable>
                </div>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

const getGradeColor = (grade: number): string => {
  if (grade >= 90) return 'bg-green-100';
  if (grade >= 80) return 'bg-blue-100';
  if (grade >= 70) return 'bg-yellow-100';
  return 'bg-red-100';
};

export default SeatingArrangement;
