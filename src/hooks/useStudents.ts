import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Student } from '@/types/gradebook';

export function useStudents(initialPeriod?: string) {
  const [students, setStudents] = useState<Record<string, Student[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const fetchStudents = async (period?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('students')
        .select('*')
        .order('name');

      if (period) {
        query = query.eq('period', period);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group students by period
      const grouped = data.reduce((acc: Record<string, Student[]>, student: Student) => {
        const period = student.period || 'unassigned';
        if (!acc[period]) acc[period] = [];
        acc[period].push(student);
        return acc;
      }, {});

      setStudents(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch students');
      } finally {
        setLoading(false);
      }
  };

  const addStudent = async (student: Omit<Student, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .insert([student])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        const newStudent = data[0];
        setStudents(prev => ({
          ...prev,
          [newStudent.period]: [...(prev[newStudent.period] || []), newStudent]
        }));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add student');
      return false;
    }
  };

  useEffect(() => {
    fetchStudents(initialPeriod);
  }, [initialPeriod]);

  const deleteStudent = async (studentId: string) => {
    try {
      // First check if student exists
      const { data: existing, error: checkError } = await supabase
        .from('students')
        .select('id, period')
        .eq('id', studentId)
        .single();

      if (checkError || !existing) {
        throw new Error('Student not found');
      }

      // Delete student and all related records in a transaction
      const { error: deleteError } = await supabase.rpc('delete_student_with_related', {
        student_id: studentId
      });

      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        throw deleteError;
      }

      // Verify deletion
      const { data: verifyDelete, error: verifyError } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId);

      if (verifyError || (verifyDelete && verifyDelete.length > 0)) {
        throw new Error('Student still exists after deletion');
      }

      // Update local state by removing the student
      setStudents(prev => {
        const updated = {...prev};
        for (const period in updated) {
          updated[period] = updated[period].filter(s => s.id !== studentId);
        }
        return updated;
      });

      return true;
    } catch (err) {
      console.error('Error deleting student:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete student');
      // Revert local state if deletion failed
      setStudents(prev => {
        const { data } = await supabase
          .from('students')
          .select('*')
          .order('class_period, name');
        
        if (data) {
          return data.reduce((acc: Record<string, Student[]>, student: Student) => {
            const period = student.period || 'unassigned';
            if (!acc[period]) acc[period] = [];
            acc[period].push(student);
            return acc;
          }, {});
        }
        return prev;
      });
      return false;
    }
  };

  return {
    students,
    loading,
    error,
    fetchStudents,
    addStudent,
    deleteStudent,
    setStudents
  };
}
