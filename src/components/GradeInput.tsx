import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabaseConfig';
import { Input } from '@/components/ui/input';
import { Toast } from '@/components/ui/toast';
import { useCustomToast } from '@/hooks/useCustomToast';

interface GradeInputProps {
  assignmentId: string;
  studentId: string;
  initialGrade?: string;
}

export function GradeInput({ assignmentId, studentId, initialGrade }: GradeInputProps) {
  const [grade, setGrade] = useState(initialGrade || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const { data: session } = useSession();
  const { toast, showToast, clearToast } = useCustomToast();

  const handleGradeChange = async (newGrade: string) => {
    setGrade(newGrade);

    try {
      setIsSyncing(true);
      
      // First update local database
      const { data: updatedGrade, error } = await supabase
        .from('grades')
        .upsert({
          assignment_id: assignmentId,
          student_id: studentId,
          grade: newGrade
        })
        .select()
        .single();

      if (error) throw error;

      // Check if this is a Google Classroom assignment
      const { data: assignment } = await supabase
        .from('assignments')
        .select('google_classroom_id, google_classroom_link')
        .eq('id', assignmentId)
        .single();

      // If it's a Google Classroom assignment, sync the grade
      if (assignment?.google_classroom_id && session?.accessToken) {
        const courseId = assignment.google_classroom_link?.split('/c/')[1]?.split('/')[0];
        
        if (courseId) {
          const res = await fetch(`/api/classroom/${courseId}/assignments/${assignment.google_classroom_id}/grades`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              gradeId: updatedGrade.id,
              grade: newGrade
            })
          });

          if (!res.ok) throw new Error('Failed to sync with Google Classroom');
          
          showToast("Grade synced with Google Classroom", 'success');
        }
      }
    } catch (error) {
      console.error('Error updating grade:', error);
      showToast("Failed to update grade", 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <div className="relative">
        <Input
          type="number"
          value={grade}
          onChange={(e) => handleGradeChange(e.target.value)}
          className="w-20 text-center"
          min="0"
          max="100"
        />
        {isSyncing && (
          <div className="absolute right-0 top-0 h-full flex items-center pr-2">
            <div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        )}
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={clearToast}
        />
      )}
    </>
  );
}
