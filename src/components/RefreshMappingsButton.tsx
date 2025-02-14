import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StudentMappingDialog } from './StudentMappingDialog';

export function RefreshMappingsButton({ courseId, periodId }: { courseId: string; periodId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>
        Manage Student Mappings
      </Button>
      
      <StudentMappingDialog
        courseId={courseId}
        periodId={periodId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
