import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface ImportDialogProps {
  assignment: {
    id: string;
    title: string;
    dueDate?: {
      year: number;
      month: number;
      day: number;
    };
  };
  onConfirm: (details: { period: string; type: string }) => void;
  onCancel: () => void;
}

export function ImportDialog({ assignment, onConfirm, onCancel }: ImportDialogProps) {
  const [period, setPeriod] = useState('1');
  const [type, setType] = useState('homework');

  const formatDueDate = (dueDate?: { year: number; month: number; day: number }) => {
    if (!dueDate) return 'No due date';
    return new Date(dueDate.year, dueDate.month - 1, dueDate.day).toLocaleDateString();
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Assignment: {assignment.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Due Date: {formatDueDate(assignment.dueDate)}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Period</label>
            <Select value={period} onValueChange={setPeriod}>
              <option value="1">Period 1</option>
              <option value="2">Period 2</option>
              <option value="3">Period 3</option>
              <option value="4">Period 4</option>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={setType}>
              <option value="homework">Homework</option>
              <option value="quiz">Quiz</option>
              <option value="test">Test</option>
              <option value="project">Project</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onConfirm({ period, type })}>Import</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
