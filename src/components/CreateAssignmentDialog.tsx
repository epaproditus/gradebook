'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getSixWeeksForDate } from '@/lib/dateUtils';

interface CreateAssignmentDialogProps {
  activeTab: string;
  students: Record<string, Student[]>;
  onAssignmentCreated: (newAssignment: Assignment) => void;
}

export function CreateAssignmentDialog({
  activeTab,
  students,
  onAssignmentCreated
}: CreateAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    name: '',
    date: new Date(),
    type: 'Daily' as 'Daily' | 'Assessment',
    subject: 'Math 8' as 'Math 8' | 'Algebra I',
    periods: [activeTab]
  });
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  const handleCreateAssignment = async () => {
    if (!newAssignment.name || newAssignment.periods.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in assignment name and select at least one period",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert([{
          id: crypto.randomUUID(),
          name: newAssignment.name,
          date: format(newAssignment.date, 'yyyy-MM-dd'),
          type: newAssignment.type,
          periods: newAssignment.periods,
          subject: newAssignment.subject,
          six_weeks_period: getSixWeeksForDate(newAssignment.date),
          max_points: 100,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      onAssignmentCreated({
        ...data,
        date: newAssignment.date
      });

      setOpen(false);
      setNewAssignment({
        name: '',
        date: new Date(),
        type: 'Daily',
        subject: 'Math 8',
        periods: [activeTab]
      });

      toast({
        title: "Success",
        description: "Assignment created successfully"
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create assignment'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create New Assignment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Assignment Name</Label>
            <Input
              placeholder="Enter assignment name"
              value={newAssignment.name}
              onChange={(e) => setNewAssignment(prev => ({
                ...prev,
                name: e.target.value
              }))}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select
                value={newAssignment.type}
                onValueChange={(value: 'Daily' | 'Assessment') => 
                  setNewAssignment(prev => ({
                    ...prev,
                    type: value
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Assessment">Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subject</Label>
              <Select
                value={newAssignment.subject}
                onValueChange={(value: 'Math 8' | 'Algebra I') => 
                  setNewAssignment(prev => ({
                    ...prev,
                    subject: value
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Math 8">Math 8</SelectItem>
                  <SelectItem value="Algebra I">Algebra I</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(newAssignment.date, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={newAssignment.date}
                  onSelect={(date) => {
                    if (date) {
                      setNewAssignment(prev => ({
                        ...prev,
                        date
                      }));
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Periods</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.keys(students).map(periodId => (
                <Button
                  key={periodId}
                  variant={
                    newAssignment.periods.includes(periodId) 
                      ? 'default' 
                      : 'outline'
                  }
                  size="sm"
                  onClick={() => {
                    setNewAssignment(prev => {
                      const periods = prev.periods.includes(periodId)
                        ? prev.periods.filter(p => p !== periodId)
                        : [...prev.periods, periodId];
                      
                      return {
                        ...prev,
                        periods
                      };
                    });
                  }}
                >
                  Period {periodId}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleCreateAssignment}
            className="w-full mt-4"
            disabled={!newAssignment.name || newAssignment.periods.length === 0}
          >
            Create Assignment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
