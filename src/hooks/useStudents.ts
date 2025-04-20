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

  return {
    students,
    loading,
    error,
    fetchStudents,
    addStudent,
    setStudents
  };
}
