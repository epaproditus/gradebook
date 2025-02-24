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
  position: SeatPosition;
}

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
    const sourceIndex = parseInt(source.droppableId.replace('droppable-', ''));
    const destIndex = parseInt(destination.droppableId.replace('droppable-', ''));
    
    const newSeats = [...seats];
    
    // Update positions based on drop location
    const updatedPosition = {
      x: destIndex % cols * 150,
      y: Math.floor(destIndex / cols) * 150
    };
    
    // Swap students between seats
    const tempStudentId = newSeats[sourceIndex].studentId;
    newSeats[sourceIndex].studentId = newSeats[destIndex].studentId;
    newSeats[destIndex].studentId = tempStudentId;
    
    setSeats(newSeats);
  };

  const renderSeat = (seat: SeatItem) => {
    const student = seat.studentId ? studentsMap.get(seat.studentId) : null;

    return (
      <Card key={seat.id} className="h-24 w-24">
        <div className="w-full h-full flex items-center justify-center">
          {student ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="text-center">
                    <div>{student.name}</div>
                    <div>{student.averageGrade.toFixed(1)}%</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{student.name}</p>
                  <p>Average: {student.averageGrade.toFixed(1)}%</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-gray-400">Empty</span>
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
        <div 
          className="relative w-full h-[600px] border rounded-lg bg-secondary/20" // Made container fixed height
          style={{ minWidth: cols * 200 }} // Increased from 150 to 200 to account for larger cards
        >
          {seats.map((seat, index) => (
            <Droppable 
              key={seat.id} 
              droppableId={`droppable-${index}`}
              isDropDisabled={false}
            >
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    position: 'absolute',
                    left: seat.position.x,
                    top: seat.position.y,
                    transition: 'all 0.2s ease',
                    padding: '8px' // Add some padding between cards
                  }}
                  className={cn(
                    "rounded border-2",
                    snapshot.isDraggingOver ? "border-primary" : "border-transparent"
                  )}
                >
                  {seat.studentId && (
                    <Draggable
                      draggableId={`draggable-${seat.id}`}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={cn(
                            snapshot.isDragging ? "z-50" : ""
                          )}
                        >
                          {renderSeat(seat)}
                        </div>
                      )}
                    </Draggable>
                  )}
                  {!seat.studentId && renderSeat(seat)}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
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
