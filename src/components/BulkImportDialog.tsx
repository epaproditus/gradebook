import { FC, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Assignment, Student } from '@/types/gradebook';
import { toast } from "@/components/ui/use-toast";

interface BulkImportDialogProps {
  onImport: (assignments: ImportedAssignment[]) => void;
  studentIds: string[];
  availablePeriods: string[];
  activeTab?: string;
  existingAssignments: Record<string, Assignment>;
  setAssignments: React.Dispatch<React.SetStateAction<Record<string, Assignment>>>;
  students: Record<string, Student[]>;
}

interface ImportedAssignment {
  name: string;
  type: 'Daily' | 'Assessment';
  subject: 'Math 8' | 'Algebra I';
  periods: string[];
  grades: Record<string, string>;
  selected: boolean;
  date: Date;
  existingId?: string;
}

interface ParsedRow {
  id: string;
  lastName: string;
  firstName: string;
  grades: string[];
}

export const BulkImportDialog: FC<BulkImportDialogProps> = ({ 
  onImport, 
  studentIds, 
  availablePeriods,
  activeTab,
  existingAssignments = {},
  setAssignments,
  students
}) => {
  const [rawData, setRawData] = useState('');
  const [parsedData, setParsedData] = useState<ImportedAssignment[]>([]);
  const [hasHeaders, setHasHeaders] = useState<boolean>(true);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  
  // Debug state to help understand processing
  const [debugInfo, setDebugInfo] = useState<{
    studentIdMatches: {id: string, found: boolean, period?: string}[];
    headers?: string[];
    firstDataRow?: string[];
    allColumns?: string[][];
    gradeDistribution?: Record<string, number>;  // Track grade counts per assignment
  } | null>(null);

  // Get student ID to period mapping for automatic period assignment
  const studentToPeriodMap = Object.entries(students).reduce((map, [period, periodStudents]) => {
    periodStudents.forEach(student => {
      map[student.id.toString()] = period;
    });
    return map;
  }, {} as Record<string, string>);

  const parseStudentName = (name: string): [string, string] => {
    // Handle empty or invalid names
    if (!name || typeof name !== 'string') return ['', ''];
    const parts = name.split(',').map(part => part.trim());
    return [parts[0] || '', parts[1] || ''];
  };

  const handlePaste = (content: string) => {
    try {
      console.log('Starting to parse pasted data...');
      
      // Split into rows and tabs
      const rows = content.trim().split('\n').map(row => row.split('\t'));
      if (rows.length < 2) {
        throw new Error('No data rows found');
      }

      // First row is always the header row when hasHeaders is true
      const headerRow = hasHeaders ? rows[0] : [];
      const dataStartIndex = hasHeaders ? 1 : 0; // Start data parsing from row 1 if we have headers
      
      // Get headers, either from the actual header row or synthetic headers if no header row
      const headers = hasHeaders 
        ? headerRow.map(h => h.toLowerCase().trim()) 
        : rows[0].map((_, idx) => `column_${idx}`);
      
      console.log('Headers detected:', headers);
      
      // More flexible column detection
      let idIndex = headers.findIndex(h => 
        h.includes('id') || 
        h.includes('number') || 
        h.match(/^\d{6}$/) ||
        h === 'student id');
        
      let nameIndex = headers.findIndex(h => 
        h === 'name' ||
        h.includes('student name'));

      console.log('Column detection:', { headers, idIndex, nameIndex });

      // If we couldn't detect the columns from headers, try to detect by data format
      if (idIndex === -1 || nameIndex === -1) {
        // Try to detect columns by data format in first data row
        const firstRow = rows[dataStartIndex].map(col => col.trim());
        console.log('Trying data format detection:', firstRow);

        if (idIndex === -1) {
          idIndex = firstRow.findIndex(col => /^\d{5,6}$/.test(col)); // More flexible ID pattern
        }
        if (nameIndex === -1) {
          nameIndex = firstRow.findIndex(col => 
            col.includes(',') && col.split(',').length === 2);
        }

        if (idIndex === -1 || nameIndex === -1) {
          throw new Error('Could not find Student ID and Name columns. Please check your data format.');
        }
      }

      // Filter out non-assignment columns and gather assignment column data
      // Each entry will be {header, index, arrayPosition}
      // - header: the column name
      // - index: the original column index in the CSV
      // - arrayPosition: position in the filtered array (used for accessing grades)
      let filteredColPosition = 0;
      const assignmentColumns = headers
        .map((header, index) => {
          // Skip the ID and Name columns directly
          if (index === idIndex || index === nameIndex) {
            return null;
          }

          // Check if it's a non-grade column (cycle grade, average, etc.)
          const isNonGradeColumn = 
            header.toLowerCase().includes('cycle') || 
            header.toLowerCase().includes('avg') || 
            header.toLowerCase().includes('average') ||
            header.toLowerCase().includes('total');
          
          // Check if it's a numeric header (0, 1, 2, etc.)
          const isNumeric = /^\d+$/.test(header);
          
          // Keep if it's numeric OR it's not a non-grade column
          const shouldKeep = isNumeric || !isNonGradeColumn;
          
          if (shouldKeep) {
            return { 
              header, 
              index, 
              arrayPosition: filteredColPosition++
            };
          }
          
          return null;
        })
        .filter(Boolean); // Filter out null entries

      console.log('Assignment columns with positions:', assignmentColumns);

      // Parse all data rows (skip header if present)
      const parsedRows = rows.slice(dataStartIndex)
        .filter(row => row.length >= Math.max(idIndex, nameIndex) + 1)
        .map(row => {
          const id = row[idIndex]?.trim() || '';
          const [lastName, firstName] = parseStudentName(row[nameIndex]);
          
          // Get grades only from the assignment columns
          const grades = assignmentColumns.map(col => {
            const value = row[col.index]?.trim() || '';
            // Debug log to see what values we're extracting
            console.log(`Student ${id}: Column ${col.header} (index ${col.index}) = "${value}"`);
            return value;
          });

          return { id, lastName, firstName, grades };
        });

      // For debugging: check if student IDs match known IDs and get their periods
      const studentIdMatches = parsedRows.map(row => ({
        id: row.id,
        found: studentIds.includes(row.id),
        period: studentToPeriodMap[row.id] || undefined
      }));
      
      // Calculate which periods are represented in the data
      const periodsInData = studentIdMatches
        .filter(match => match.found && match.period)
        .map(match => match.period || '')
        .filter((period, index, self) => period && self.indexOf(period) === index);

      // Create a grades distribution tracker
      const gradeDistribution: Record<string, number> = {};

      // Create assignments from the filtered assignment columns
      const newAssignments = assignmentColumns.map(({ header, index, arrayPosition }) => {
        // Generate a better name for numeric headers - preserve original number
        let assignmentName = header.trim();
        if (/^\d+$/.test(header)) {
          assignmentName = `Assignment ${header}`;
        } else if (assignmentName === '') {
          assignmentName = `Assignment ${index + 1}`;
        }
            
        // Safely check for existing assignment
        const matchingAssignment = Object.values(existingAssignments)
          .find(a => a.name.toLowerCase() === assignmentName.toLowerCase());

        // Construct grades object by student ID - this time using arrayPosition
        const gradesObject: Record<string, string> = {};
        parsedRows.forEach(row => {
          // Use arrayPosition to get the right grade from the grades array
          const gradeValue = row.grades[arrayPosition]?.trim();
          
          if (gradeValue && row.id) {
            // Check if this student exists in our roster
            if (studentIds.includes(row.id)) {
              // Only add non-zero grades
              if (gradeValue !== '0') {
                gradesObject[row.id] = gradeValue;
              }
            } else {
              console.warn(`Student ID ${row.id} not found in roster, skipping grade import`);
            }
          }
        });

        // Track how many grades we found for this assignment
        gradeDistribution[assignmentName] = Object.keys(gradesObject).length;

        return {
          name: assignmentName,
          type: matchingAssignment?.type || 'Daily',
          subject: matchingAssignment?.subject || 'Math 8',
          periods: periodsInData.length ? periodsInData : (activeTab ? [activeTab] : []),
          grades: gradesObject,
          selected: true,
          date: matchingAssignment?.date || new Date(),
          existingId: matchingAssignment?.id
        };
      });

      // Set detailed debug info to help diagnose issues
      setDebugInfo({
        studentIdMatches,
        headers,
        firstDataRow: rows[dataStartIndex],
        allColumns: assignmentColumns.map(col => [col.header, `${col.index}:${col.arrayPosition}`]),
        gradeDistribution
      });

      console.log('Parsed rows:', parsedRows);
      console.log('Student ID matching:', studentIdMatches);
      console.log('Periods in data:', periodsInData);
      console.log('Grade distribution:', gradeDistribution);
      console.log('New assignments with grades:', newAssignments);

      setParsedData(newAssignments);
    } catch (error) {
      console.error('Error parsing data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to parse data"
      });
    }
  };

  const handleImport = () => {
    const assignmentsToImport = parsedData
      .filter(a => a.selected)
      .map(a => {
        if (a.existingId) {
          // If mapping to existing assignment, use its properties
          const existingAssignment = existingAssignments[a.existingId];
          return {
            ...a,
            id: a.existingId,
            // Use existing assignment properties but with our grades
            subject: existingAssignment.subject,
            type: existingAssignment.type,
            date: existingAssignment.date,
            // Ensure we merge with existing periods properly
            periods: Array.from(new Set([...existingAssignment.periods, ...a.periods]))
          };
        }
        
        // Otherwise create new assignment with detected periods
        return a;
      });

    if (assignmentsToImport.length === 0) {
      toast({
        title: "No assignments selected",
        description: "Please select at least one assignment to import.",
        variant: "destructive"
      });
      return;
    }

    // Show number of grades being imported for each assignment
    const summaryInfo = assignmentsToImport.map(a => 
      `${a.name}: ${Object.keys(a.grades).length} grades`
    ).join(', ');
    
    console.log('Import summary:', summaryInfo);
    
    // Call the import function
    onImport(assignmentsToImport);
    
    toast({
      title: "Import started",
      description: `Importing ${assignmentsToImport.length} assignments. ${summaryInfo}`,
    });
    
    // Close the dialog after successful import
    if (dialogCloseRef.current) {
      dialogCloseRef.current.click();
    }
  };

  // We can import if we have assignments with grades
  const hasSelections = parsedData.some(a => a.selected);
  const hasGrades = parsedData.some(a => Object.keys(a.grades).length > 0);
  const canImport = parsedData.length > 0 && hasSelections && hasGrades;

  return (
    <DialogContent className="max-w-4xl h-[80vh]" aria-describedby="import-description">
      <DialogHeader>
        <DialogTitle>Bulk Import Assignments</DialogTitle>
        <p id="import-description" className="text-sm text-muted-foreground">
          Import multiple assignments and grades from a spreadsheet. Map to existing assignments or create new ones.
        </p>
      </DialogHeader>
      
      {!parsedData.length ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox 
              id="hasHeaders" 
              checked={hasHeaders}
              onCheckedChange={(checked) => setHasHeaders(!!checked)}
            />
            <label 
              htmlFor="hasHeaders"
              className="text-sm font-medium cursor-pointer"
            >
              First row contains headers
            </label>

            <div className="ml-auto">
              <Checkbox
                id="debugMode"
                checked={debugMode}
                onCheckedChange={(checked) => setDebugMode(!!checked)}
              />
              <label
                htmlFor="debugMode"
                className="text-sm font-medium cursor-pointer ml-2"
              >
                Show debug info
              </label>
            </div>
          </div>

          <div className="border rounded p-4">
            <h3 className="text-sm font-medium mb-2">Instructions:</h3>
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              <li>Copy and paste your gradebook data</li>
              <li>Check the "First row contains headers" box if your data has column headers</li>
              <li>Data must include Student ID and Name columns</li>
              <li>Each additional column will be treated as an assignment</li>
              <li>Columns labeled "Cycle Grade", "Average", etc. will be ignored</li>
              <li>Student class periods will be automatically detected based on student IDs</li>
            </ul>
          </div>

          <Textarea 
            placeholder="Paste your gradebook data here..."
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            onPaste={(e) => {
              const content = e.clipboardData.getData('text');
              handlePaste(content);
            }}
            className="flex-1 min-h-[200px] font-mono text-sm"
          />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          {/* Debug info shown only when debug mode is enabled */}
          {debugMode && debugInfo && (
            <div className="border border-amber-200 bg-amber-50 p-3 mb-4 rounded-md">
              <h4 className="font-medium text-amber-800 mb-1">Import Debug Info</h4>
              <div className="text-sm text-amber-700 space-y-1">
                <p>Student ID matches: {debugInfo.studentIdMatches.filter(m => m.found).length} of {debugInfo.studentIdMatches.length} matched</p>
                <p>Periods detected: {Array.from(new Set(debugInfo.studentIdMatches.filter(m => m.found && m.period).map(m => m.period))).join(', ')}</p>
                {debugInfo.studentIdMatches.filter(m => !m.found).length > 0 && (
                  <p>Unmatched IDs: {debugInfo.studentIdMatches.filter(m => !m.found).map(m => m.id).join(', ')}</p>
                )}
                {debugInfo.allColumns && (
                  <div>
                    <p>Assignment columns (header, index:position):</p>
                    <ul className="text-xs">
                      {debugInfo.allColumns.map((col, i) => (
                        <li key={i}>{col[0]} ({col[1]})</li>
                      ))}
                    </ul>
                  </div>
                )}
                {debugInfo.gradeDistribution && (
                  <div>
                    <p>Grades found per assignment:</p>
                    <ul className="text-xs">
                      {Object.entries(debugInfo.gradeDistribution).map(([name, count], i) => (
                        <li key={i}>{name}: {count} grades</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox 
                    checked={parsedData.every(a => a.selected)}
                    onCheckedChange={(checked) => {
                      setParsedData(prev => prev.map(a => ({...a, selected: !!checked})));
                    }}
                  />
                </TableHead>
                <TableHead>Column Header</TableHead>
                <TableHead>Assignment Name</TableHead>
                <TableHead>Map to Existing</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-32">Date</TableHead>
                <TableHead className="text-right"># Grades</TableHead>
                <TableHead className="text-right">Periods</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedData.map((assignment, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Checkbox 
                      checked={assignment.selected}
                      onCheckedChange={(checked) => {
                        setParsedData(prev => prev.map((a, i) => 
                          i === index ? { ...a, selected: !!checked } : a
                        ));
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {assignment.name}
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={assignment.name}
                      onChange={(e) => {
                        setParsedData(prev => prev.map((a, i) => 
                          i === index ? { ...a, name: e.target.value } : a
                        ));
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={assignment.existingId || 'new'}
                      onValueChange={(value) => {
                        setParsedData(prev => prev.map((a, i) => 
                          i === index ? { 
                            ...a, 
                            existingId: value === 'new' ? undefined : value,
                            // Copy properties from existing assignment if selected
                            ...(value !== 'new' ? {
                              type: existingAssignments[value].type,
                              subject: existingAssignments[value].subject,
                              date: existingAssignments[value].date
                            } : {})
                          } : a
                        ));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Create New" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Create New</SelectItem>
                        {Object.entries(existingAssignments).map(([id, assignment]) => (
                          <SelectItem key={id} value={id}>
                            {assignment.name} ({format(assignment.date, 'MM/dd')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={assignment.type}
                      onValueChange={(value: 'Daily' | 'Assessment') => {
                        setParsedData(prev => prev.map((a, i) => 
                          i === index ? { ...a, type: value } : a
                        ));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Assessment">Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="date"
                      value={assignment.date.toISOString().split('T')[0]}
                      onChange={(e) => {
                        setParsedData(prev => prev.map((a, i) => 
                          i === index ? { ...a, date: new Date(e.target.value) } : a
                        ));
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Object.keys(assignment.grades).length}
                  </TableCell>
                  <TableCell className="text-right">
                    {assignment.periods.join(', ')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
      
      <div className="flex justify-end gap-2 mt-4">
        <Button
          variant="outline"
          onClick={() => {
            setRawData('');
            setParsedData([]);
            setDebugInfo(null);
          }}
        >
          Clear
        </Button>
        <DialogClose ref={dialogCloseRef} asChild>
          <button className="hidden" aria-hidden="true" />
        </DialogClose>
        <Button
          onClick={handleImport}
          disabled={!canImport}
        >
          Import Selected ({parsedData.filter(a => a.selected).length})
          {!hasGrades && parsedData.length > 0 && (
            <span className="ml-2 text-xs text-red-500">
              No grades found
            </span>
          )}
        </Button>
      </div>
    </DialogContent>
  );
};

export default BulkImportDialog;
