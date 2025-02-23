'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SeatingArrangement } from '@/components/SeatingArrangement';

export default function SeatingPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const loadStudents = async () => {
      // Simpler query first to debug
      const { data, error } = await supabase
        .from('students')
        .select('id, name, class_period')
        .eq('class_period', '1st');

      // Debug what we got back
      console.log('Raw query result:', {
        error,
        data,
        count: data?.length || 0,
        sql: 'SELECT id, name, class_period FROM students WHERE class_period = \'1st\''
      });

      if (error) {
        console.error('Error loading students:', error);
        return;
      }

      const mappedStudents = data.map(s => ({
        id: s.id,
        name: s.name,
        class_period: s.class_period,
        averageGrade: 85
      }));

      console.log('Mapped students:', {
        count: mappedStudents.length,
        first: mappedStudents[0],
        periods: [...new Set(mappedStudents.map(s => s.class_period))]
      });

      setStudents(mappedStudents);
    };

    loadStudents();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Seating Arrangement</h1>
      <SeatingArrangement 
        students={students}
        rows={5}
        cols={6}
        selectedPeriod="1st"
      />
    </div>
  );
}
