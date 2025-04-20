'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState } from "react";

interface AddStudentDialogProps {
  period: string;
  onStudentAdded: () => void;
}

export function AddStudentDialog({ period, onStudentAdded }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .insert([{
          name: name.trim(),
          class_period: period,
          period: period
        }])
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student added successfully"
      });
      setOpen(false);
      setName('');
      onStudentAdded();
    } catch (error) {
      console.error('Error adding student:', error);
      toast({
        title: "Error",
        description: "Failed to add student",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Full Name</Label>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Last, First"
            />
          </div>
          <div>
            <Label>Class Period</Label>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-primary" />
              <span>Period {period}</span>
            </div>
          </div>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-4"
          >
            {loading ? "Adding..." : "Add Student"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
