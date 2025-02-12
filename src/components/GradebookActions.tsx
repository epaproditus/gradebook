import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useState } from "react";
import LoadingSpinner from "./ui/loading-spinner";

interface Props {
  courseId: string;
  period: string;
}

export function GradebookActions({ courseId, period }: Props) {
  const { data: session } = useSession();
  const [exporting, setExporting] = useState(false);

  const handleExportGrades = async () => {
    if (!session?.accessToken) return;
    
    setExporting(true);
    try {
      const res = await fetch(`/api/classroom/${courseId}/grades/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({ period })
      });

      if (!res.ok) {
        throw new Error('Failed to export grades');
      }

      alert('Grades exported successfully to Google Classroom!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export grades to Google Classroom');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex justify-end gap-2 mb-4">
      <Button
        variant="outline"
        onClick={handleExportGrades}
        disabled={exporting}
      >
        {exporting && <LoadingSpinner className="w-4 h-4 mr-2" />}
        Export Grades to Google Classroom
      </Button>
    </div>
  );
}
