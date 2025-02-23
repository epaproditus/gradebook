'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SeatingArrangement from '@/components/SeatingArrangement';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Student {
  id: string;
  name: string;
  averageGrade: number;
}

export default function SeatingPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1');
  const [periods, setPeriods] = useState<string[]>([]);
  const supabase = createClientComponentClient();

  // Fetch available periods
  useEffect(() => {
    async function fetchPeriods() {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('period')
          .not('period', 'is', null);

        if (error) {
          console.error('Error fetching periods:', error);
          return;
        }

        const uniquePeriods = Array.from(new Set(
          data.map(d => d.period)
        )).filter(Boolean).sort();

        setPeriods(uniquePeriods);
        if (uniquePeriods.length > 0) {
          setSelectedPeriod(uniquePeriods[0]);
        }
      } catch (error) {
        console.error('Error in fetchPeriods:', error);
      }
    }
    fetchPeriods();
  }, [supabase]);

  useEffect(() => {
    async function fetchStudents() {
      try {
        // First fetch students for the selected period
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id, name')
          .eq('period', selectedPeriod);

        if (studentsError) throw studentsError;

        if (!students || students.length === 0) {
          setStudents([]);
          return;
        }

        // Fetch recent grades for these students
        const studentIds = students.map(s => s.id);
        const { data: grades, error: gradesError } = await supabase
          .from('grades')
          .select('grade, student_id')
          .in('student_id', studentIds)
          .order('created_at', { ascending: false });

        if (gradesError) throw gradesError;

        // Calculate average grades for each student
        const studentsWithGrades = students.map(student => {
          const studentGrades = grades
            ?.filter(g => g.student_id.toString() === student.id.toString())
            .map(g => {
              const grade = g.grade.replace(/[^0-9.]/g, '');
              return parseFloat(grade);
            })
            .filter(g => !isNaN(g)) || [];

          const averageGrade = studentGrades.length > 0
            ? studentGrades.reduce((sum, grade) => sum + grade, 0) / studentGrades.length
            : 0;

          return {
            id: student.id.toString(),
            name: student.name,
            averageGrade
          };
        });

        setStudents(studentsWithGrades);
        setError(null);
      } catch (error: any) {
        const errorMessage = error.message || 'An unexpected error occurred';
        console.error('Error in fetchStudents:', errorMessage);
        setError(errorMessage);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }

    if (selectedPeriod) {
      setLoading(true);
      setError(null);
      fetchStudents();
    }
  }, [supabase, selectedPeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Seating Arrangement</CardTitle>
          <Select
            value={selectedPeriod}
            onValueChange={(value) => setSelectedPeriod(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period} value={period}>
                  Period {period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {error ? (
            <Card className="bg-red-50 mb-4">
              <CardContent className="pt-6">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Generate homogeneous (similar grades together) or heterogeneous (mixed grades) seating arrangements. 
                Drag and drop students to customize the arrangement. Use primary and secondary layouts for different arrangements.
              </p>
              <SeatingArrangement
                students={students}
                rows={5}
                cols={6}
                selectedPeriod={selectedPeriod}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
