import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button'; // Add this import
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseConfig';

interface MappingRow {
  googleEmail: string;
  studentId: number | null;
  mappedAt: string | null;
  classroomUserId: string; // Add this field
}

interface Props {
  courseId: string;
  periodId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  additionalPeriods?: string[]; // Add this prop for linked periods
}

export function StudentMappingDialog({ 
  courseId, 
  periodId, 
  additionalPeriods = [],
  open, 
  onOpenChange 
}: Props) {
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [rosterStudents, setRosterStudents] = useState<Array<{ id: number; name: string; period: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [autoMatches, setAutoMatches] = useState<Set<string>>(new Set()); // Track auto-matched emails

  // Add helper function to clean names
  const cleanName = (name: string): string => {
    return name
      .toLowerCase()
      // Remove common suffixes
      .replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, '')
      // Remove any remaining periods
      .replace(/\./g, '')
      // Remove extra spaces
      .trim();
  };

  const findBestNameMatch = (googleEmail: string, rosterStudents: Array<{ id: number; name: string }>) => {
    // Extract name from email (format: firstname.lastname123@domain.com)
    const emailMatch = googleEmail.match(/^([^.]+)\.([^0-9@]+)/);
    if (!emailMatch) return null;

    const [_, emailFirstName, emailLastName] = emailMatch;
    const normalizedEmailFirst = cleanName(emailFirstName);
    const normalizedEmailLast = cleanName(emailLastName);

    // Find best matching student
    return rosterStudents.find(student => {
      // Parse roster name (format: "LastName, FirstName")
      const [lastName, firstName] = student.name.split(',').map(s => cleanName(s));
      
      // Check for exact matches first
      if (lastName === normalizedEmailLast && firstName === normalizedEmailFirst) {
        return true;
      }

      // Handle compound last names and suffixes (e.g., "De La Cruz" or "Smith Jr")
      const lastNames = lastName.split(' ').map(cleanName);
      
      // Check if any part of the last name matches
      const hasMatchingLastName = lastNames.some(ln => 
        normalizedEmailLast.includes(ln) || ln.includes(normalizedEmailLast)
      );

      // Check if first names match (allowing for shortened versions)
      const firstNameMatch = 
        normalizedEmailFirst === firstName ||
        firstName.startsWith(normalizedEmailFirst) ||
        normalizedEmailFirst.startsWith(firstName);

      return hasMatchingLastName && firstNameMatch;
    });
  };

  // Load existing mappings and roster students
  useEffect(() => {
    const loadData = async () => {
      if (!open) return;
      
      setLoading(true);
      try {
        // Get all periods we need to fetch
        const periodsToFetch = [periodId, ...additionalPeriods];
        
        console.log('Fetching students for periods:', periodsToFetch);

        // Fetch students from all relevant periods
        const { data: students } = await supabase
          .from('students')
          .select('id, name, period')
          .in('period', periodsToFetch)
          .order('period, name');

        if (students) {
          setRosterStudents(students);
          console.log('Loaded students:', {
            total: students.length,
            byPeriod: students.reduce((acc, s) => {
              acc[s.period] = (acc[s.period] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          });
        }

        // Fetch Google Classroom students with their IDs
        const response = await fetch(`/api/classroom/${courseId}/students`);
        const { students: googleStudents } = await response.json();

        // Update query to get all mappings for this period
        const { data: existingMappings, error: mappingError } = await supabase
          .from('student_mappings')
          .select('*')
          .eq('period', periodId); // Only filter by period

        if (mappingError) {
          console.error('Error fetching mappings:', mappingError);
          throw mappingError;
        }

        console.log('Debug mapping data:', {
          periodId,
          totalMappings: existingMappings?.length || 0,
          mappings: existingMappings,
          googleStudents: googleStudents.length,
        });

        // Create mapping rows with existing data
        const rows: MappingRow[] = googleStudents.map(gStudent => {
          const email = gStudent.profile.emailAddress;
          const existingMapping = existingMappings?.find(m => m.google_email === email);
          
          // If no existing mapping, try to find a match by name
          if (!existingMapping && students) {
            const matchedStudent = findBestNameMatch(email, students);
            if (matchedStudent) {
              console.log('Found name match:', {
                email,
                matchedStudent: matchedStudent.name
              });
              return {
                googleEmail: email,
                studentId: matchedStudent.id,
                mappedAt: null,
                classroomUserId: gStudent.userId
              };
            }
          }
          
          return {
            googleEmail: email,
            studentId: existingMapping?.student_id || null,
            mappedAt: existingMapping?.created_at || null,
            classroomUserId: gStudent.userId // Store the actual Google Classroom user ID
          };
        });

        console.log('Mapping results:', {
          total: rows.length,
          matched: rows.filter(r => r.studentId !== null).length
        });

        setMappings(rows);

      } catch (error) {
        console.error('Error loading mapping data:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load student data"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, periodId, additionalPeriods, open]);

  const performAutoMapping = async (
    googleStudents: any[], 
    rosterStudents: Array<{ id: number; name: string }>
  ) => {
    const automaticMappings: MappingRow[] = [];
    
    for (const gStudent of googleStudents) {
      const email = gStudent.profile.emailAddress;
      const emailParts = email.split('@')[0].toLowerCase().split('.');
      
      // Parse email more carefully
      const emailFirstName = emailParts[0];
      const emailLastNameWithNumbers = emailParts[1] || '';
      const emailLastName = emailLastNameWithNumbers.replace(/\d+$/, ''); // Remove trailing numbers

      // Track best match score
      let bestMatch = {
        studentId: null as number | null,
        score: 0,
        mappedAt: null as string | null
      };

      // Check each roster student for a match
      rosterStudents.forEach(student => {
        // Parse roster name (format: "LastName, FirstName")
        const [lastNames, firstName] = student.name.split(',').map(s => s.trim().toLowerCase());
        const rosterLastNames = lastNames.split(' '); // Handle multiple last names
        const rosterFirstName = firstName;

        let score = 0;

        // Check first name match (3 points)
        if (emailFirstName === rosterFirstName) {
          score += 3;
        } else if (emailFirstName.startsWith(rosterFirstName) || rosterFirstName.startsWith(emailFirstName)) {
          score += 2; // Partial first name match
        }

        // Check last name match (2 points)
        if (rosterLastNames.some(ln => emailLastName === ln)) {
          score += 2;
        } else if (rosterLastNames.some(ln => emailLastName.includes(ln) || ln.includes(emailLastName))) {
          score += 1; // Partial last name match
        }

        // Update best match if this score is higher
        if (score > bestMatch.score) {
          bestMatch = {
            studentId: student.id,
            score,
            mappedAt: null
          };
        }
      });

      // Only auto-map if we have a good match (score of 4 or higher)
      automaticMappings.push({
        googleEmail: email,
        studentId: bestMatch.score >= 4 ? bestMatch.studentId : null,
        mappedAt: bestMatch.mappedAt,
        classroomUserId: gStudent.userId // Store the actual Google Classroom user ID
      });
    }

    console.log('Auto-mapping results:', automaticMappings);
    setMappings(automaticMappings);
    return automaticMappings;
  };

  // Updated handleSaveMatches to handle unique constraints
  const handleSaveMatches = async () => {
    try {
      const matchesToSave = mappings.filter(m => m.studentId !== null);

      if (matchesToSave.length === 0) {
        toast({
          title: "No Changes",
          description: "No matches to save"
        });
        return;
      }

      // First, fetch all existing mappings
      const { data: existingMappings } = await supabase
        .from('student_mappings')
        .select('google_id, google_email, student_id')
        .eq('period', periodId);

      // Prepare upsert data with unique google_ids
      const upsertData = matchesToSave.map(mapping => ({
        google_id: mapping.classroomUserId,        // The actual Google ID (e.g., '117250249726374130315')
        classroom_user_id: `${mapping.googleEmail.split('@')[0]}_${periodId}`, // Our generated ID (e.g., 'cristian.marquez544_6th')
        google_email: mapping.googleEmail,
        student_id: mapping.studentId,
        period: periodId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Delete existing mappings for this period
      const { error: deleteError } = await supabase
        .from('student_mappings')
        .delete()
        .eq('period', periodId);

      if (deleteError) throw deleteError;

      // Insert new mappings
      const { error: insertError } = await supabase
        .from('student_mappings')
        .insert(upsertData);

      if (insertError) throw insertError;

      // Update local state
      setMappings(prev => prev.map(m => ({
        ...m,
        mappedAt: matchesToSave.some(match => match.googleEmail === m.googleEmail)
          ? new Date().toISOString()
          : m.mappedAt
      })));

      toast({
        title: "Success",
        description: `Saved ${matchesToSave.length} student mappings`
      });
    } catch (error) {
      console.error('Error saving matches:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save mappings"
      });
    }
  };

  const handleUpdateMapping = async (googleEmail: string, value: string) => {
    console.log('Updating mapping:', { googleEmail, value });
    
    const studentId = value === 'unmapped' ? null : Number(value);

    try {
      if (studentId) {
        // First check if this student is already mapped in this period
        const { data: existingMapping, error: checkError } = await supabase
          .from('student_mappings')
          .select('google_email')
          .match({ 
            student_id: studentId,
            period: periodId 
          })
          .single();

        if (existingMapping) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "This student is already mapped to another Google account in this period"
          });
          return;
        }

        // Delete any existing mapping for this Google email
        await supabase
          .from('student_mappings')
          .delete()
          .match({ 
            period: periodId,
            google_email: googleEmail 
          });

        const mappingToUpdate = mappings.find(m => m.googleEmail === googleEmail);
        if (!mappingToUpdate) return;

        // Create new mapping with correct ID fields
        const { error: insertError } = await supabase
          .from('student_mappings')
          .insert({
            google_id: mappingToUpdate.classroomUserId,  // The actual Google ID
            classroom_user_id: `${googleEmail.split('@')[0]}_${periodId}`, // Our generated ID
            google_email: googleEmail,
            student_id: studentId,
            period: periodId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }

        // Update local state only after successful database update
        setMappings(prev => prev.map(m => 
          m.googleEmail === googleEmail 
            ? { ...m, studentId, mappedAt: new Date().toISOString() }
            : m
        ));

        toast({
          title: "Success",
          description: "Student mapping updated"
        });
      } else {
        // Handle unmapping
        const { error: deleteError } = await supabase
          .from('student_mappings')
          .delete()
          .match({
            period: periodId,
            google_email: googleEmail
          });

        if (deleteError) throw deleteError;

        // Update local state
        setMappings(prev => prev.map(m => 
          m.googleEmail === googleEmail 
            ? { ...m, studentId: null, mappedAt: null }
            : m
        ));

        toast({
          title: "Success",
          description: "Mapping removed"
        });
      }
    } catch (error) {
      console.error('Mapping error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update mapping"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle>Map Students - Period {periodId}</DialogTitle>
          <Button
            onClick={handleSaveMatches}
            className="flex items-center gap-2"
          >
            Save All Matches
            <span className="text-xs text-muted-foreground">
              ({mappings.filter(m => (autoMatches.has(m.googleEmail) || m.mappedAt) && m.studentId).length})
            </span>
          </Button>
        </DialogHeader>
        <ScrollArea className="h-[600px] pr-4">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {/* Headers */}
              <div className="font-medium text-sm">Google Email</div>
              <div className="font-medium text-sm">Roster Student</div>
              <div className="font-medium text-sm">Status</div>

              {/* Mapping Rows */}
              {mappings.map((mapping) => (
                <React.Fragment key={mapping.googleEmail}>
                  <div className="text-sm">{mapping.googleEmail}</div>
                  <Select
                    defaultValue="unmapped"
                    value={mapping.studentId?.toString() || 'unmapped'}
                    onValueChange={(value) => {
                      console.log('Select value changed:', value); // Debug log
                      handleUpdateMapping(mapping.googleEmail, value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unmapped">Not mapped</SelectItem>
                      {rosterStudents.map((student) => (
                        <SelectItem 
                          key={student.id} 
                          value={student.id.toString()}
                        >
                          {student.name} 
                          {student.period !== periodId && (
                            <span className="ml-2 text-muted-foreground">
                              ({student.period})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div>
                    {mapping.mappedAt ? (
                      <Badge variant="success">
                        Mapped {new Date(mapping.mappedAt).toLocaleDateString()}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Mapped</Badge>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
