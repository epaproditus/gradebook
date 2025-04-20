'use client';

import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
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
  const [studentId, setStudentId] = useState('');
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  const handleSubmit = async () => {
    // Validate name format (Last, First)
    if (!name.trim() || !name.includes(',')) {
      toast({
        title: "Invalid Name",
        description: "Please enter name as 'Last, First'",
        variant: "destructive"
      });
      return;
    }

    // Validate student ID is numeric
    if (!studentId.trim() || !/^\d+$/.test(studentId)) {
      toast({
        title: "Invalid ID",
        description: "Student ID must contain only numbers",
        variant: "destructive"
      });
      return;
    }

    // Check for existing student by name and ID
    const { data: existing } = await supabase
      .from('students')
      .select('id, name')
      .or(`name.eq.${name.trim()},id.eq.${studentId.trim()}`)
      .maybeSingle();

    if (existing) {
      toast({
        title: "Student Exists",
        description: existing.name === name.trim() 
          ? `Student ${name.trim()} already exists`
          : `Student ID ${studentId.trim()} already exists`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .insert([{
          id: Number(studentId.trim()),
          name: name.trim(),
          class_period: period,
          period: period
        }])
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: `${name.trim()} (ID: ${studentId.trim()}) added to Period ${period}`
      });
      setName('');
      setStudentId('');
      onStudentAdded();
      setOpen(false); // Move this after onStudentAdded
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add student",
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
            <Label>Student ID *</Label>
            <Input 
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="12345"
              required
            />
          </div>
          <div>
            <Label>Full Name *</Label>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Last, First"
              required
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
