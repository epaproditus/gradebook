import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSession } from 'next-auth/react';
import LoadingSpinner from './ui/loading-spinner';
import { supabase } from '@/lib/supabaseConfig';
import { useToast } from '@/hooks/use-toast';

interface RosterStudent {
  id: string;
  name: string;
  email?: string;
  class_period: string;
}

interface GoogleStudent {
  googleId: string;
  googleEmail?: string;
  googleName: {
    givenName: string;
    familyName: string;
    fullName: string;
  };
}

interface GoogleClassroomStudent {
  userId: string;
  profile: {
    emailAddress: string;
    name: {
      givenName: string;
      familyName: string;
      fullName: string;
    }
  }
}

interface StudentMatch {
  googleId: string;
  googleEmail?: string;
  googleName: string;
  matchedStudent?: RosterStudent;
  manuallyMatched?: boolean;
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
    .trim();
}

function getNameMatchScore(googleName: { givenName: string; familyName: string }, rosterName: string): number {
  try {
    // Split roster name (assuming format: "LastName, FirstName")
    const [rosterLast, rosterFirst] = rosterName.split(',').map(s => s.trim().toLowerCase());
    const googleFirst = googleName.givenName.toLowerCase();
    const googleLast = googleName.familyName.toLowerCase();

    // Direct match
    if (googleFirst === rosterFirst && googleLast === rosterLast) {
      return 1;
    }

    // Partial matches
    const firstNameScore = googleFirst.includes(rosterFirst) || rosterFirst.includes(googleFirst) ? 0.5 : 0;
    const lastNameScore = googleLast.includes(rosterLast) || rosterLast.includes(googleLast) ? 0.5 : 0;

    return firstNameScore + lastNameScore;
  } catch (error) {
    console.error('Error matching names:', { googleName, rosterName, error });
    return 0;
  }
}

function extractNameParts(fullName: string): [string, string] {
  const parts = fullName.split(',').map(s => s.trim().toLowerCase());
  if (parts.length === 2) {
    return [parts[0], parts[1]]; // lastName, firstName
  }
  // Fallback: treat the whole thing as lastName if no comma
  return [fullName.toLowerCase(), ''];
}

interface DialogProps {
  courseId: string;
  courseName: string;
  open: boolean;
  onClose: () => void;
}

const SUBJECTS = ['Math 8', 'Algebra I'] as const;
type Subject = typeof SUBJECTS[number];

export function CourseSetupDialog({ 
  courseId, 
  courseName,
  open, 
  onClose 
}: DialogProps) {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<string>('');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentMatch[]>([]);
  const [rosterStudents, setRosterStudents] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [error, setError] = useState<string | null>(null); // Moved inside component
  const [mappedPeriods, setMappedPeriods] = useState<string[]>([]);
  const [setupStatus, setSetupStatus] = useState<'checking' | 'new' | 'existing'>('checking');
  const [activePeriod, setActivePeriod] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject>('Math 8');
  const [localStudents, setLocalStudents] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});

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
        const uniquePeriods = Array.from(new Set(data.map(s => s.class_period)))
          .filter(Boolean)
          .sort((a, b) => {
            // Sort by numeric value of period
            const aNum = parseInt(a.match(/\d+/)[0]);
            const bNum = parseInt(b.match(/\d+/)[0]);
            return aNum - bNum;
          });

        console.log('Found periods:', uniquePeriods);

        setAvailablePeriods(uniquePeriods);
        // Remove auto-selection of first period
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
    async function fetchMappedPeriods() {
      const { data } = await supabase
        .from('course_mappings')
        .select('period')
        .eq('google_course_id', courseId);
        
      setMappedPeriods(data?.map(d => d.period) || []);
    }

    if (open) {
      fetchMappedPeriods();
    }
  }, [courseId, open]);

  useEffect(() => {
    async function loadStudents() {
      if (!period) return;
      
      setLoading(true);
      try {
        console.log('Loading students for period:', period);

        // First check if period is already mapped
        const { data: existingMapping } = await supabase
          .from('course_mappings')
          .select('*')
          .eq('google_course_id', courseId)
          .eq('period', period)
          .single();

        if (existingMapping) {
          // Load existing mappings
          const { data: mappedStudents } = await supabase
            .from('student_mappings')
            .select(`
              *,
              students (*)
            `)
            .eq('period', period);

          // Set existing mappings
          if (mappedStudents?.length) {
            setStudents(mappedStudents.map(m => ({
              googleId: m.google_id,
              googleEmail: m.google_email,
              googleName: m.students.name,
              matchedStudent: m.students,
              manuallyMatched: true
            })));
          }
        }

        // Fetch fresh Google Classroom data
        const res = await fetch(`/api/classroom/${courseId}/students`, {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to fetch students');

        // Get gradebook students for this period
        const { data: gradebookStudents, error: dbError } = await supabase
          .from('students')
          .select('*')
          .eq('class_period', period)
          .order('name');

        if (dbError) throw dbError;

        // Auto-match students based on name similarity
        const matchedStudents = data.students.map((googleStudent: any) => {
          let bestMatch = null;
          let bestScore = 0;

          gradebookStudents.forEach(gs => {
            const score = getNameMatchScore(
              googleStudent.googleName,
              gs.name
            );
            if (score > bestScore) {
              bestScore = score;
              if (score >= 0.8) {
                bestMatch = gs;
              }
            }
          });

          return {
            googleId: googleStudent.googleId,
            googleEmail: googleStudent.googleEmail || '',
            googleName: googleStudent.googleName.fullName,
            matchedStudent: bestMatch,
            manuallyMatched: false
          };
        });

        console.log('Matched students:', matchedStudents);
        setRosterStudents(gradebookStudents);
        setStudents(matchedStudents);

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

  // Add setup status check
  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!period) return;

      const { data } = await supabase
        .from('course_mappings')
        .select('setup_completed')
        .eq('google_course_id', courseId)
        .eq('period', period)
        .eq('setup_completed', true)
        .maybeSingle();

      setSetupStatus(data ? 'existing' : 'new');
      setLoading(false);
    };

    if (period) {
      checkSetupStatus();
    }
  }, [courseId, period, setSetupStatus, setLoading]);

  useEffect(() => {
    const loadExistingSetup = async () => {
      if (!period) return;

      // Load existing mapping
      const { data: mapping } = await supabase
        .from('course_mappings')
        .select('*')
        .eq('google_course_id', courseId)
        .eq('period', period)
        .single();

      console.log('Existing mapping:', mapping);

      // Load student mappings
      const { data: studentMappings } = await supabase
        .from('student_mappings')
        .select(`
          *,
          students (*)
        `)
        .eq('period', period);

      console.log('Existing student mappings:', studentMappings);

      // Update subject if it exists
      if (mapping?.subject) {
        setSelectedSubject(mapping.subject as Subject);
      }
    };

    loadExistingSetup();
  }, [period, courseId]);

  const handleSave = async () => {
    try {
      console.log('Starting save process...');
      
      // 1. Update course mapping
      const { data: existingMapping } = await supabase
        .from('course_mappings')
        .select('*')
        .eq('google_course_id', courseId)
        .eq('period', period)
        .maybeSingle();
  
      console.log('Existing mapping:', existingMapping);
  
      // Create or update course mapping
      const { error: mappingError } = await supabase
        .from('course_mappings')
        .upsert({
          ...(existingMapping || {}),
          google_course_id: courseId,
          period: period,
          subject: selectedSubject,
          setup_completed: true,
          setup_completed_at: new Date().toISOString()
        }, {
          onConflict: 'google_course_id,period'
        });
  
      if (mappingError) throw mappingError;
  
      // 2. Clear existing student mappings for this period first
      const { error: deleteError } = await supabase
        .from('student_mappings')
        .delete()
        .eq('period', period);
  
      if (deleteError) throw deleteError;
  
      // 3. Insert new student mappings
      const matchedStudents = students.filter(s => s.matchedStudent);
      if (matchedStudents.length > 0) {
        const mappingUpdates = matchedStudents.map(student => ({
          google_id: student.googleId,
          google_email: student.googleEmail,
          student_id: student.matchedStudent!.id,
          period: period
        }));
  
        console.log('Inserting new mappings:', mappingUpdates);
  
        // Use upsert with the correct unique constraint
        const { error: mappingsError } = await supabase
          .from('student_mappings')
          .upsert(mappingUpdates, {
            onConflict: 'student_id,period'  // This is the key change
          });
  
        if (mappingsError) throw mappingsError;
      }
  
      toast({
        title: "Success",
        description: `Mapped ${matchedStudents.length} students for period ${period}`
      });
  
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save mappings'
      });
    }
  };

  const handlePeriodSelect = (selectedPeriod: string) => {
    setPeriod(selectedPeriod);
    setActivePeriod(selectedPeriod);
  };

  // Only show loading when fetching students
  const showLoading = loading && setupStatus === 'new';

  // Modified subject selector component
  const SubjectSelector = () => (
    <div className="space-y-2">
      <Label>Subject</Label>
      <Select
        value={selectedSubject}
        onValueChange={(value: Subject) => setSelectedSubject(value)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select subject..." />
        </SelectTrigger>
        <SelectContent>
          {SUBJECTS.map(subject => (
            <SelectItem key={subject} value={subject}>
              {subject}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // Show completed setup message
  if (setupStatus === 'existing') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{courseName} - Period {period}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-green-600 mb-4">✓ This period is already set up.</p>
            <SubjectSelector />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Update Setup</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const autoMapStudents = () => {
    const newMappings: Record<string, string> = {};
    
    students.forEach(googleStudent => {
      // Try to find matching student by name
      const matchingStudent = localStudents.find(local => {
        const googleName = googleStudent.googleName;
        return local.name.toLowerCase() === googleName.toLowerCase();
      });

      if (matchingStudent) {
        newMappings[matchingStudent.id] = googleStudent.googleId;
      }
    });

    setMappings(newMappings);
  };

  const saveStudentMappings = async () => {
    // Update student records with Google IDs
    const updates = Object.entries(mappings).map(([localId, googleId]) => ({
      id: localId,
      google_id: googleId,
      google_email: students.find(s => s.googleId === googleId)?.googleEmail
    }));

    const { error } = await supabase
      .from('students')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      console.error('Error saving mappings:', error);
      return;
    }

    onClose();
  };

  // Main setup view
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Setup {courseName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
          <div className="sticky top-0 bg-white z-10 pb-4 border-b">
            <Label>Select Period</Label>
            {!period && (
              <p className="text-sm text-gray-500 mb-2">
                Please select a class period to continue
              </p>
            )}
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
                    onClick={() => handlePeriodSelect(p)}
                    disabled={!!activePeriod && activePeriod !== p}
                    className={`
                      ${p.includes('SPED') ? 'bg-blue-50' : ''}
                      ${mappedPeriods.includes(p) ? 'border-green-500' : ''}
                    `}
                  >
                    {formatPeriodDisplay(p)}
                    {mappedPeriods.includes(p) && (
                      <span className="ml-2 text-xs text-green-600">✓</span>
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

          {period && <SubjectSelector />}

          {showLoading ? (
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
            Complete Setup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function toast({ title, description, variant = "default" }: { 
  title: string; 
  description: string; 
  variant?: "default" | "destructive" 
}) {
  const { toast: showToast } = useToast();
  showToast({
    title,
    description,
    variant
  });
}

