'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import { BenchmarkScores } from '@/components/BenchmarkScores';

export default function StudentPage({ params }: { params: { id: string } }) {
  const [student, setStudent] = useState<any>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function loadStudent() {
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', params.id)
        .single();

      if (student) {
        setStudent(student);
      }
    }

    loadStudent();
  }, [params.id]);

  if (!student) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{student.name}</h1>
      <BenchmarkScores studentId={parseInt(params.id)} />
    </div>
  );
}
