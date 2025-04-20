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
        .eq('is_active', true)
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

  const deactivateStudent = async (studentId: string) => {
    try {
      // First try with both fields
      let { error } = await supabase
        .from('students')
        .update({ is_active: false })
        .eq('id', studentId);

      // If that fails, try without updated_at
      if (error?.code === 'PGRST204') {
        ({ error } = await supabase
          .from('students')
          .update({ is_active: false })
          .eq('id', studentId));
      }

      if (error) throw error;

      // Refresh students data after deactivation
      await fetchStudents();
      
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
    deactivateStudent,
    setStudents
  };
}
