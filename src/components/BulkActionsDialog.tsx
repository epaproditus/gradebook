'use client';

import { FC, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from 'lucide-react';
import { Assignment } from '@/types/gradebook';
import { format } from 'date-fns';
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkActionsDialogProps {
  assignments: Record<string, Assignment>;
  onDelete: (assignmentIds: string[]) => Promise<void>;
}

export const BulkActionsDialog: FC<BulkActionsDialogProps> = ({
  assignments,
  onDelete
}) => {
  const [open, setOpen] = useState(false);
  const [selectedAssignments, setSelectedAssignments] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleAssignment = (assignmentId: string) => {
    setSelectedAssignments(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allSelected = Object.keys(assignments).reduce((acc, id) => {
        acc[id] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setSelectedAssignments(allSelected);
    } else {
      setSelectedAssignments({});
    }
  };

  const handleDelete = async () => {
    const idsToDelete = Object.entries(selectedAssignments)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
    
    if (idsToDelete.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${idsToDelete.length} assignments? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    
    try {
      await onDelete(idsToDelete);
      setSelectedAssignments({});
      setOpen(false);
    } catch (error) {
      console.error('Error deleting assignments:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedCount = Object.values(selectedAssignments).filter(Boolean).length;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Bulk Actions
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
          </DialogHeader>
          
          <div className="mt-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="select-all"
                  checked={
                    Object.keys(assignments).length > 0 && 
                    Object.keys(assignments).length === selectedCount
                  }
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium leading-none cursor-pointer">
                  Select All
                </label>
              </div>
              <span className="text-sm text-muted-foreground">
                {selectedCount} selected
              </span>
            </div>
            
            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-2">
                {Object.entries(assignments).map(([id, assignment]) => (
                  <div
                    key={id}
                    className="flex items-center space-x-2 border rounded p-2 hover:bg-muted"
                  >
                    <Checkbox 
                      id={`assignment-${id}`}
                      checked={!!selectedAssignments[id]}
                      onCheckedChange={() => handleToggleAssignment(id)}
                    />
                    <label htmlFor={`assignment-${id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-sm">{assignment.name}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        <span>{format(new Date(assignment.date), 'MM/dd/yyyy')}</span>
                        <span>•</span>
                        <span>{assignment.type}</span>
                        <span>•</span>
                        <span>{assignment.periods.length} periods</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={selectedCount === 0 || isDeleting}
              >
                {isDeleting ? 'Deleting...' : `Delete ${selectedCount} Assignment${selectedCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};