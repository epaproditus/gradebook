'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StudentDashboard() {
  const [student, setStudent] = useState<any>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const loadStudent = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.email) {
        const { data: studentData } = await supabase
          .from('student_mappings')
          .select('*, students(*)')
          .eq('google_email', session.user.email)
          .single();

        if (studentData) {
          setStudent(studentData);
        }
      }
    };

    loadStudent();
  }, []);

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Student Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Student Info</h3>
              <p className="text-sm text-muted-foreground">
                Period: {student.period}
              </p>
              {student.students && (
                <p className="text-sm text-muted-foreground">
                  Name: {student.students.name}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
