import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useSession } from 'next-auth/react';
import LoadingSpinner from './ui/loading-spinner';
import { supabase } from '@/lib/supabaseConfig';
import { toast } from '@/components/ui/use-toast';

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

interface ExistingMapping {
  google_id: string;
  student_id: string;
  period: string;
}

interface StudentMappingWithDetails {
  id: string;
  google_id: string;
  period: string;
  students: RosterStudent;
}

interface StudentMappingResult {
  id: string;
  google_id: string;
  google_email: string;
  students: {
    id: string;
    name: string;
    class_period: string;
  };
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

// Update the name extraction function
function extractNameParts(fullName: string): [string, string] {
  const parts = fullName.split(',').map((n: string) => n.trim().toLowerCase());
  if (parts.length === 2) {
    return [parts[0], parts[1]];
  }
  return [fullName.toLowerCase(), ''];
}

interface DialogProps {
  courseId: string;
  courseName: string;
  open: boolean;
  onClose: () => void;
}

const SUBJECTS = ['7th Grade Math', 'Math 8', 'Algebra I'] as const;
type Subject = typeof SUBJECTS[number];

interface GoogleStudentMatch {
  googleId: string;
  googleName: string;
  googleEmail: string | undefined; // Make email optional to match StudentMatch
}

interface LocalStudent {
  id: string;
  name: string;
}

interface Grade {
  student_id: string;
  score: number;
  period: string;
}

// 1. First, update the interface to match the database response
interface StudentMappingResponse {
  id: string;
  google_id: string;
  google_email: string;
  period: string;
  students: {
    id: string;
    name: string;
    class_period: string;
    email?: string;
  }[];
}

// First, add a debug logging utility
function debugLog(message: string, data: any) {
  console.log(`[CourseSetup Debug] ${message}:`, data);
}

// 1. Add type for student mapping result near other interfaces
interface StudentDBMapping {
  id: string;
  google_id: string;
  google_email: string | null;
  students: {
    id: string;
    name: string;
    class_period: string;
  };
}

// 1. Add this interface at the top with other interfaces
interface StudentMapping {
  id: string;
  google_id: string;
  google_email: string | null;
  students: {
    id: string;
    name: string;
    class_period: string;
  };
}

// 1. First consolidate interfaces
interface StudentMappingBase {
  id: string;
  google_id: string;
  google_email: string | null;
  students: {
    id: string;
    name: string;
    class_period: string;
  };
}

// Add this near the top with other utility functions
function matchStudentNames(
  googleName: { givenName: string; familyName: string },
  rosterName: string
): boolean {
  // Split roster name (format: "LastName, FirstName")
  const [rosterLast = '', rosterFirst = ''] = rosterName.split(',').map(n => n.trim().toLowerCase());
  const googleFirst = googleName.givenName.toLowerCase();
  const googleLast = googleName.familyName.toLowerCase();

  // Debug log the comparison
  console.log('Comparing names:', {
    google: { first: googleFirst, last: googleLast },
    roster: { first: rosterFirst, last: rosterLast }
  });

  return googleFirst.includes(rosterFirst) || rosterFirst.includes(googleFirst) &&
         googleLast.includes(rosterLast) || rosterLast.includes(googleLast);
}

const ERROR_MESSAGES = {
  NO_STUDENTS: 'No students found in this period',
  FETCH_ERROR: 'Failed to load students',
  MAPPING_ERROR: 'Failed to create student mappings',
  SETUP_ERROR: 'Failed to complete setup'
} as const;

function getLastName(fullName: string): string {
  // For roster names (LastName, FirstName format)
  if (fullName.includes(',')) {
    return fullName.split(',')[0].trim().toLowerCase();
  }
  // For Google names (FirstName LastName format)
  return fullName.split(' ').slice(-1)[0].trim().toLowerCase();
}

function sortByLastName<T extends { name: string }>(students: T[]): T[] {
  return [...students].sort((a, b) => getLastName(a.name).localeCompare(getLastName(b.name)));
}

// Update the name matching utilities
function getFirstLastName(fullName: string): string {
  // For roster names (LastName LastName, FirstName format)
  if (fullName.includes(',')) {
    const [lastNames] = fullName.split(',');
    // Get just the first last name
    return lastNames.split(' ')[0].toLowerCase().trim();
  }
  // For Google names (FirstName LastName LastName format)
  const nameParts = fullName.split(' ');
  // Get the first last name (first word after given name)
  return nameParts[1]?.toLowerCase().trim() || '';
}

// Add this near other utility functions at the top
function getCompoundLastName(fullName: string): string {
  // For roster names in "LastName LastName, FirstName" format
  if (fullName.includes(',')) {
    const [lastNames] = fullName.split(',');
    return lastNames.split(' ')[0].toLowerCase().trim();
  }
  // For Google names in "FirstName LastName LastName" format
  const parts = fullName.split(' ');
  if (parts.length > 2) {
    // Get the first of the last names
    return parts[1].toLowerCase().trim();
  }
  // Default to last word as last name
  return parts[parts.length - 1].toLowerCase().trim();
}

// Add this utility function near the top with other utilities
function removeDuplicateMappings(mappings: any[]) {
  const seen = new Set();
  return mappings.filter(mapping => {
    const key = `${mapping.student_id}-${mapping.period}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
  const [courseDetails, setCourseDetails] = useState<any>(null);
  const [currentMappings, setCurrentMappings] = useState<{
    google: string;
    local: string;
    googleName: string;
    localName: string;
  }[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [sortedGoogleStudents, setSortedGoogleStudents] = useState<StudentMatch[]>([]);
  const [sortedRosterStudents, setSortedRosterStudents] = useState<RosterStudent[]>([]);

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

  const loadStudents = async () => {
    if (!period || !session?.accessToken) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 1. Get Google Classroom students first
      const response = await fetch(`/api/classroom/${courseId}/students`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Google Classroom students');
      }

      const googleData = await response.json();
      
      if (!googleData.students?.length) {
        setError(ERROR_MESSAGES.NO_STUDENTS);
        return;
      }

      // 2. Get gradebook students
      const { data: gradebookStudents, error: rosterError } = await supabase
        .from('students')
        .select('*')
        .eq('class_period', period);

      if (rosterError) throw rosterError;

      // Debug log the data
      console.log('Data loaded:', {
        google: googleData.students.length,
        gradebook: gradebookStudents?.length,
        period
      });

      // 3. Create initial matched students array
      const matchedStudents = googleData.students.map((googleStudent: GoogleClassroomStudent): StudentMatch => ({
        googleId: googleStudent.userId,
        googleEmail: googleStudent.profile?.emailAddress,
        googleName: googleStudent.profile?.name.fullName,
        matchedStudent: undefined,
        manuallyMatched: false
      }));

      setRosterStudents(gradebookStudents || []);
      setStudents(matchedStudents);
      
    } catch (error) {
      console.error('Load error:', error);
      setError(error instanceof Error ? error.message : ERROR_MESSAGES.FETCH_ERROR);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load students. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadStudents() {
      if (!period) return;
      
      setLoading(true);
      try {
        // 1. Check if period is already mapped
        const { data: existingMapping } = await supabase
          .from('course_mappings')
          .select('*')
          .eq('google_course_id', courseId)
          .eq('period', period)
          .single();

        if (existingMapping?.setup_completed) {
          toast({
            title: "Already Mapped",
            description: `This course is already mapped to period ${period}. You can update the existing mapping.`
          });
          setSetupStatus('existing');
          return;
        }

        // 2. Fetch roster students first
        const { data: gradebookStudents } = await supabase
          .from('students')
          .select('*')
          .eq('class_period', period);

        // 3. Fetch existing student mappings
        const { data: existingMappings } = await supabase
          .from('student_mappings')
          .select('*')
          .eq('period', period) as { data: ExistingMapping[] | null };

        // 4. Fetch Google Classroom students
        const response = await fetch(`/api/classroom/${courseId}/students`, {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        const googleData = await response.json();
        
        // Store course details
        setCourseDetails(googleData.course);

        if (!response.ok) {
          if (response.status === 401) {
            toast({
              variant: "destructive",
              title: "Session Expired",
              description: "Your session has expired. Please login again."
            });
            return;
          }
          throw new Error(googleData.error || 'Failed to fetch students');
        }

        if (!googleData.students?.length) {
          console.warn('No students returned from API');
          return;
        }

        // 5. Create matched students array using existing mappings
        const matchedStudents = googleData.students.map((googleStudent: GoogleClassroomStudent) => {
          // Find existing mapping for this Google student
          const existingMapping = existingMappings?.find((m: ExistingMapping) => 
            m.google_id === googleStudent.userId
          );
          
          // Find matched student from gradebook if mapping exists
          const matchedStudent = existingMapping 
            ? gradebookStudents?.find((gs: RosterStudent) => 
                gs.id === existingMapping.student_id
              )
            : null;

          return {
            googleId: googleStudent.userId,
            googleEmail: googleStudent.profile?.emailAddress,
            googleName: googleStudent.profile?.name.fullName,
            matchedStudent: matchedStudent || null,
            manuallyMatched: !!existingMapping
          };
        });

        console.log('Matched students with existing mappings:', matchedStudents);
        setRosterStudents(gradebookStudents || []);
        setStudents(matchedStudents);

      } catch (error) {
        console.error('Load error:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to load students'
        });
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

      try {
        // Load existing course mapping
        const { data: mapping } = await supabase
          .from('course_mappings')
          .select('*')
          .eq('google_course_id', courseId)
          .eq('period', period)
          .single();

        // Load student mappings with student details and proper type assertion
        const { data: studentMappings } = await supabase
          .from('student_mappings')
          .select(`
            *,
            students (
              id,
              name,
              class_period
            )
          `)
          .eq('period', period) as { data: StudentMappingWithDetails[] | null };

        console.log('Existing mapping:', mapping);
        console.log('Student mappings:', studentMappings);

        // Update subject if it exists
        if (mapping?.subject) {
          setSelectedSubject(mapping.subject as Subject);
        }

        // Safe check for studentMappings
        if (studentMappings && studentMappings.length > 0) {
          setStudents(prevStudents => 
            prevStudents.map(student => {
              const existingMapping = studentMappings.find(
                m => m.google_id === student.googleId
              );
              
              if (existingMapping) {
                return {
                  ...student,
                  matchedStudent: existingMapping.students,
                  manuallyMatched: true
                };
              }
              return student;
            })
          );
        }
      } catch (error) {
        console.error('Error loading existing setup:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load existing mappings"
        });
      }
    };

    if (open) {
      loadExistingSetup();
    }
  }, [period, courseId, open]);

  // 1. Add debug logging in loadExistingSetup
  useEffect(() => {
    const loadExistingSetup = async () => {
      if (!period) return;
  
      try {
        // Load student mappings with more detailed query
        const { data: studentMappings } = await supabase
          .from('student_mappings')
          .select(`
            id,
            google_id,
            google_email,
            period,
            students!inner (
              id,
              name,
              class_period,
              email
            )
          `)
          .eq('period', period) as { data: StudentMappingResponse[] | null };

        console.log('Loaded student mappings:', {
          count: studentMappings?.length,
          mappings: studentMappings,
        });

        if (studentMappings && studentMappings.length > 0) {
          setCurrentMappings(
            studentMappings.map(mapping => ({
              google: mapping.google_id,
              local: mapping.students[0]?.id || '', // Access first student in the array
              googleName: students.find(s => s.googleId === mapping.google_id)?.googleName || '',
              localName: mapping.students[0]?.name || '' // Access first student in the array
            }))
          );
        }
  
        // Add debug table to UI
        const debugInfo = document.createElement('pre');
        debugInfo.textContent = JSON.stringify(studentMappings, null, 2);
        document.body.appendChild(debugInfo);
  
        // ...rest of existing code...
      } catch (error) {
        console.error('Error loading mappings:', error);
      }
    };
  
    if (open) {
      loadExistingSetup();
    }
  }, [period, courseId, open, students]);

  // Add a dedicated effect just for loading mappings
  useEffect(() => {
    async function loadMappings() {
      if (!period) return;

      debugLog('Loading mappings for period', period);

      try {
        // First, load the student mappings
        const { data: mappings } = await supabase
          .from('student_mappings')
          .select(`
            id,
            google_id,
            google_email,
            students:students!inner (
              id,
              name,
              class_period
            )
          `)
          .eq('period', period);

        debugLog('Fetched mappings', mappings);

        if (mappings && mappings.length > 0) {
          // Format the mappings for display
          const formattedMappings = mappings.map(mapping => ({
            google: mapping.google_id,
            local: mapping.students[0]?.id,
            googleName: mapping.google_email?.split('@')[0] || 'Unknown',
            localName: mapping.students[0]?.name
          }));

          debugLog('Formatted mappings', formattedMappings);
          setCurrentMappings(formattedMappings);
        }

      } catch (error) {
        console.error('Error loading mappings:', error);
      }
    }

    loadMappings();
  }, [period]);

  // Define loadMappings function
  const loadMappings = async () => {
    if (!period) return;

    debugLog('Loading mappings for period', period);

    try {
      const { data: mappings } = await supabase
        .from('student_mappings')
        .select(`
          id,
          google_id,
          google_email,
          students!inner (
            id,
            name,
            class_period
          )
        `)
        .eq('period', period);

      debugLog('Fetched mappings', mappings);

      if (mappings && mappings.length > 0) {
        const formattedMappings = mappings.map(mapping => ({
          google: mapping.google_id,
          local: mapping.students[0]?.id,
          googleName: mapping.google_email?.split('@')[0] || 'Unknown',
          localName: mapping.students[0]?.name
        }));

        debugLog('Formatted mappings', formattedMappings);
        setCurrentMappings(formattedMappings);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    }
  };

  // Modify the existing setup state check
  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!period) return;

      const { data: setup } = await supabase
        .from('course_mappings')
        .select('*')
        .eq('google_course_id', courseId)
        .eq('period', period)
        .single();

      debugLog('Setup status', setup);

      if (setup?.setup_completed) {
        setSetupStatus('existing');
        // Force a reload of mappings when we know it's an existing setup
        loadMappings();
      } else {
        setSetupStatus('new');
      }
      setLoading(false);
    };

    checkSetupStatus();
  }, [courseId, period]);

  // Add this effect to handle auto-matching
  useEffect(() => {
    if (!students.length || !rosterStudents.length) return;

    // Sort both lists by last name
    const sortedGoogle = [...students].sort((a, b) => 
      getLastName(a.googleName).localeCompare(getLastName(b.googleName))
    );

    const sortedRoster = sortByLastName(rosterStudents);

    // Store sorted lists
    setSortedGoogleStudents(sortedGoogle);
    setSortedRosterStudents(sortedRoster);

    // Create matches based on sorted lists
    const newStudents = students.map(student => {
      // Skip if already matched
      if (student.matchedStudent) return student;

      const googleLastName = getLastName(student.googleName);
      const potentialMatch = sortedRoster.find(roster => 
        getLastName(roster.name) === googleLastName
      );

      if (potentialMatch) {
        return {
          ...student,
          matchedStudent: potentialMatch,
          manuallyMatched: false
        };
      }
      return student;
    });

    setStudents(newStudents);

  }, [students.length, rosterStudents.length]); // Only depend on lengths to prevent loops

  // Replace the auto-matching effect with this updated version
  useEffect(() => {
    if (!students.length || !rosterStudents.length) return;
  
    // Sort both lists by first last name
    const sortedGoogle = [...students].sort((a, b) => 
      getCompoundLastName(a.googleName).localeCompare(getCompoundLastName(b.googleName))
    );
  
    const sortedRoster = [...rosterStudents].sort((a, b) => 
      getCompoundLastName(a.name).localeCompare(getCompoundLastName(b.name))
    );
  
    // Store sorted lists
    setSortedGoogleStudents(sortedGoogle);
    setSortedRosterStudents(sortedRoster);
  
    // Attempt matches based on first last name
    const newStudents = students.map(student => {
      if (student.matchedStudent) return student;
  
      const googleLastName = getCompoundLastName(student.googleName);
      const potentialMatch = rosterStudents.find(roster => 
        getCompoundLastName(roster.name) === googleLastName
      );
  
      if (potentialMatch) {
        return {
          ...student,
          matchedStudent: potentialMatch,
          manuallyMatched: false
        };
      }
      return student;
    });
  
    setStudents(newStudents);
  }, [students.length, rosterStudents.length]);

  // Update the handleSave function
  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Debug current state
      console.log('Save operation started:', {
        courseId,
        period,
        studentsToMap: students.filter(s => s.matchedStudent).length
      });

      // 1. First clear any existing mappings for this period
      const { error: clearError } = await supabase
        .from('student_mappings')
        .delete()
        .eq('period', period);

      if (clearError) {
        console.error('Failed to clear existing mappings:', clearError);
        throw clearError;
      }

      // 2. Create course mapping
      const { error: courseError } = await supabase
        .from('course_mappings')
        .upsert(
          {
            google_course_id: courseId,
            period: period,
            subject: selectedSubject,
            setup_completed: true,
            setup_completed_at: new Date().toISOString()
          },
          { onConflict: 'google_course_id,period' }
        );

      if (courseError) throw courseError;

      // 3. Create student mappings
      const studentMappings = students
        .filter(s => s.matchedStudent && s.googleId)
        .map(student => ({
          student_id: student.matchedStudent!.id,
          google_id: student.googleId,
          google_email: student.googleEmail,
          period: period,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

      // Remove any duplicate mappings
      const uniqueMappings = removeDuplicateMappings(studentMappings);

      if (uniqueMappings.length === 0) {
        toast({
          title: "Warning",
          description: "No student mappings to create",
          variant: "default"
        });
        onClose();
        return;
      }

      // Insert mappings
      const { error: mappingError } = await supabase
        .from('student_mappings')
        .insert(uniqueMappings);

      if (mappingError) throw mappingError;

      // Verify the save
      const { data: verifyData } = await supabase
        .from('student_mappings')
        .select('*')
        .eq('period', period);

      toast({
        title: "Success",
        description: `Created ${verifyData?.length || 0} student mappings for period ${period}`
      });

      onClose();

    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save mappings"
      });
    } finally {
      setLoading(false);
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
    
    students.forEach((student: StudentMatch) => { // Change type to StudentMatch
      // Try to find matching student by name
      const matchingStudent = localStudents.find((local: LocalStudent) => {
        const googleName = student.googleName;
        return local.name.toLowerCase() === googleName.toLowerCase();
      });

      if (matchingStudent) {
        newMappings[matchingStudent.id] = student.googleId;
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

  // Add this component for unmapped students warning
  const UnmappedStudentsWarning = ({ students }: { students: StudentMatch[] }) => {
    const unmapped = students.filter(s => !s.matchedStudent);
    if (unmapped.length === 0) return null;
  
    return (
      <div className="bg-yellow-50 p-4 rounded-md mb-4">
        <h3 className="font-medium text-yellow-800">Unmapped Students ({unmapped.length})</h3>
        <p className="text-sm text-yellow-700 mb-2">
          These students will not be mapped. This is normal if the class is split across periods.
        </p>
        <div className="max-h-32 overflow-y-auto">
          {unmapped.map(student => (
            <div key={student.googleId} className="text-sm py-1 border-b border-yellow-100">
              {student.googleName} ({student.googleEmail})
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Main setup view
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            Setup {courseName}
            {courseDetails && (
              <div className="text-sm text-gray-500 mt-1">
                Google Classroom: {courseDetails.name}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
          {/* Period Selection Section */}
          <div className="sticky top-0 bg-white z-10 pb-4 border-b">
            <Label>Select Period</Label>
            {!period && (
              <p className="text-sm text-gray-500 mb-2">
                Please select a class period to continue
              </p> // Make sure this is present
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

          {/* Auto-matching Debug Info */}
          {period && (
            <div className="bg-yellow-50 p-4 rounded-md mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Google Classroom (Sorted)</h4>
                  <div className="text-sm space-y-1">
                    {sortedGoogleStudents.map(s => (
                      <div key={s.googleId} className="flex justify-between">
                        <span>{getLastName(s.googleName)}</span>
                        <span className="text-gray-500">{s.googleName}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Roster Students (Sorted)</h4>
                  <div className="text-sm space-y-1">
                    {sortedRosterStudents.map(s => (
                      <div key={s.id} className="flex justify-between">
                        <span>{getLastName(s.name)}</span>
                        <span className="text-gray-500">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student Matching Table */}
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

          {/* Mapping Status */}
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <h3 className="font-medium mb-2">Mapping Status</h3>
            <div className="space-y-2 text-sm">
              <p>Total Google Students: {students.length}</p>
              <p>Total Gradebook Students: {rosterStudents.length}</p>
              <p>Matched Students: {students.filter(s => s.matchedStudent).length}</p>
              <p>Unmatched Students: {students.filter(s => !s.matchedStudent).length}</p>
            </div>
          </div>

          {/* Current Matches */}
          <div className="mb-4">
            <h4 className="font-medium mb-2">Current Matches:</h4>
            {students
              .filter(s => s.matchedStudent)
              .map(student => (
                <div key={student.googleId} className="text-sm py-1 border-b">
                  <span className="text-blue-600">{student.googleName}</span>
                  {' → '}
                  <span className="text-green-600">{student.matchedStudent?.name}</span>
                </div>
              ))
            }
          </div>

          {/* Loading/Existing Mappings */}
          {loadingMappings ? (
            <div className="p-4 text-center">
              <LoadingSpinner className="w-4 h-4 mr-2" />
              <span>Loading mappings...</span>
            </div>
          ) : currentMappings.length > 0 ? (
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="font-medium mb-2">Existing Mappings</h3>
              <div className="max-h-40 overflow-y-auto">
                {currentMappings.map((mapping, index) => (
                  <div key={index} className="text-sm py-1 border-b border-blue-100">
                    <div className="flex justify-between">
                      <span className="text-blue-600">{mapping.googleName}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-green-600">{mapping.localName}</span>
                    </div>
                  </div>
                ))}
              </div>
              <pre className="text-xs bg-white p-2 mt-2 rounded">
                {JSON.stringify({
                  mappingsCount: currentMappings.length,
                  matchedStudents: students.filter(s => s.matchedStudent).length
                }, null, 2)}
              </pre>
            </div>
          ) : null}

          {/* Add the warning component before the save button */}
          {period && <UnmappedStudentsWarning students={students} />}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSave}
            disabled={students.filter(s => s.matchedStudent).length === 0} // Only disable if NO students are mapped
          >
            Complete Setup ({students.filter(s => s.matchedStudent).length} of {students.length} mapped)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

