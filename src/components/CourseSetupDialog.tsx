import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSession } from 'next-auth/react';
import LoadingSpinner from './ui/loading-spinner';
import { supabase } from '@/lib/supabaseConfig';

interface StudentMatch {
  googleId: string;
  googleEmail: string;
  googleName: string;
  matchedStudent?: {
    id: string;
    name: string;
    email: string;
  };
  manuallyMatched?: boolean;
}

export function CourseSetupDialog({ 
  courseId, 
  courseName,
  open, 
  onClose 
}: { 
  courseId: string;
  courseName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<string>('');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentMatch[]>([]);
  const [rosterStudents, setRosterStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  // Add helper function for period display
  const formatPeriodDisplay = (period: string) => {
    // Strip "(SPED)" for display but keep full value in state
    return period.replace(' (SPED)', '');
  };

  useEffect(() => {
    async function fetchPeriods() {
      setLoadingPeriods(true);
      try {
        console.log('Fetching periods...');
        
        const { data, error } = await supabase
          .from('students')
          .select('class_period')
          .not('class_period', 'is', null)
          .order('class_period');

        if (error) {
          console.error('Period fetch error:', error);
          throw error;
        }

        // Get unique periods preserving the full period string
        const uniquePeriods = [...new Set(data.map(s => s.class_period))]
          .filter(Boolean)
          .sort((a, b) => {
            // Sort by numeric value of period
            const aNum = parseInt(a.match(/\d+/)[0]);
            const bNum = parseInt(b.match(/\d+/)[0]);
            return aNum - bNum;
          });

        console.log('Found periods:', uniquePeriods);

        setAvailablePeriods(uniquePeriods);
        if (uniquePeriods.length > 0) {
          setPeriod(uniquePeriods[0]);
        }
      } catch (error) {
        console.error('Error fetching periods:', error);
      } finally {
        setLoadingPeriods(false);
      }
    }

    if (open) {
      fetchPeriods();
    }
  }, [open]);

  useEffect(() => {
    async function loadStudents() {
      if (!period) return;
      
      setLoading(true);
      try {
        console.log('Loading students for period:', period);

        const res = await fetch(`/api/classroom/${courseId}/students`, {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await res.json();
        
        // Log full response for debugging
        console.log('API Response:', data);

        if (!res.ok) {
          console.error('API Error:', data);
          throw new Error(data.error || 'Failed to fetch students');
        }

        // Filter gradebook students for current period
        const periodStudents = (data.gradebookStudents || []).filter(
          (s: any) => s.class_period === period
        );

        // Set the students
        setRosterStudents(periodStudents);
        setStudents(data.students || []);

        // Log what we're setting
        console.log('Setting state:', {
          periodStudents: periodStudents.length,
          googleStudents: data.students?.length,
          period
        });

      } catch (error) {
        console.error('Load error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (open && session?.accessToken && period) {
      loadStudents();
    }
  }, [courseId, period, open, session?.accessToken]);

  const handleSave = async () => {
    try {
      await supabase
        .from('course_mappings')
        .upsert({ 
          google_course_id: courseId,
          period 
        });

      const mappings = students
        .filter(s => s.matchedStudent)
        .map(s => ({
          google_id: s.googleId,
          google_email: s.googleEmail,
          student_id: s.matchedStudent!.id
        }));

      await supabase
        .from('student_mappings')
        .upsert(mappings);

      onClose();
    } catch (error) {
      console.error('Error saving mappings:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Setup {courseName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
          <div className="sticky top-0 bg-white z-10 pb-4 border-b">
            <Label>Select Period</Label>
            {loadingPeriods ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner className="w-4 h-4" />
                <span>Loading periods...</span>
              </div>
            ) : availablePeriods.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {availablePeriods.map((p) => (
                  <Button
                    key={p}
                    variant={period === p ? "default" : "outline"}
                    onClick={() => setPeriod(p)}
                    className={p.includes('SPED') ? 'bg-blue-50' : ''}
                  >
                    {formatPeriodDisplay(p)}
                    {p.includes('SPED') && (
                      <span className="ml-1 text-xs text-blue-600">(SPED)</span>
                    )}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-red-500 p-4 bg-red-50 rounded-md">
                <p>No periods found in gradebook.</p>
                <p>Please make sure you have:</p>
                <ul className="list-disc ml-5 mt-2">
                  <li>Added students to your gradebook</li>
                  <li>Assigned periods to your students</li>
                </ul>
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-md space-y-2 text-sm mt-4">
              <p><strong>Debug Info:</strong></p>
              <p>Selected Period: {period}</p>
              <p>Gradebook Students: {rosterStudents.length}</p>
              <p>Google Students: {students.length}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-4">
              <LoadingSpinner />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center p-4 text-orange-600 bg-orange-50 rounded-md">
              <p className="font-medium">No Google Classroom students found</p>
              <p className="text-sm mt-1">Debug information:</p>
              <pre className="text-xs mt-2 text-left bg-white p-2 rounded">
                {JSON.stringify({ period, rosterCount: rosterStudents.length }, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden mt-4">
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Google Classroom Student</th>
                    <th className="px-4 py-2 text-left">Match With Gradebook Student</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.googleId} className="border-t">
                      <td className="px-4 py-2">
                        <div className="font-medium">{student.googleName}</div>
                        <div className="text-sm text-gray-500">{student.googleEmail}</div>
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          value={student.matchedStudent?.id?.toString() || ""}
                          onValueChange={(value) => {
                            const matchedStudent = rosterStudents.find(
                              rs => rs.id.toString() === value
                            );
                            setStudents(students.map(s =>
                              s.googleId === student.googleId
                                ? { ...s, matchedStudent, manuallyMatched: true }
                                : s
                            ));
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select student..." />
                          </SelectTrigger>
                          <SelectContent>
                            {rosterStudents.map((s) => (
                              <SelectItem 
                                key={s.id} 
                                value={s.id.toString()}
                              >
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        {student.matchedStudent ? (
                          <span className="text-green-600">
                            ✓ {student.manuallyMatched ? 'Manually' : 'Auto'} Matched
                          </span>
                        ) : (
                          <span className="text-orange-600">Needs matching</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSave}
            disabled={students.some(s => !s.matchedStudent)}
          >
            Save Mappings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
