import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Assignment } from '@/types/gradebook';
import { toast } from "@/components/ui/use-toast"; // Add this import

interface BulkImportDialogProps {
  onImport: (assignments: ImportedAssignment[]) => void;
  studentIds: string[];
  availablePeriods: string[];
  activeTab?: string;
  existingAssignments: Record<string, Assignment>;
  setAssignments: React.Dispatch<React.SetStateAction<Record<string, Assignment>>>; // Add this
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
  existingAssignments = {}, // Provide default empty object
  setAssignments, // Add this
}) => {
  // Initialize selectedPeriods with activeTab if provided
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>(
    activeTab ? [activeTab] : []
  );
  const [rawData, setRawData] = useState('');
  const [parsedData, setParsedData] = useState<ImportedAssignment[]>([]);
  const [assignmentMappings, setAssignmentMappings] = useState<Record<number, string>>({});

  const parseStudentName = (name: string): [string, string] => {
    // Handle empty or invalid names
    if (!name || typeof name !== 'string') return ['', ''];
    const parts = name.split(',').map(part => part.trim());
    return [parts[0] || '', parts[1] || ''];
  };

  const handlePaste = (content: string) => {
    try {
      const rows = content.trim().split('\n').map(row => row.split('\t'));
      if (rows.length < 2) {
        throw new Error('No data rows found');
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());
      
      // More flexible column detection
      const idIndex = headers.findIndex(h => 
        h.includes('id') || h.includes('number') || h.match(/^\d{6}$/));
      const nameIndex = headers.findIndex(h => 
        h.includes('name') || h.includes('student'));

      console.log('Column detection:', { headers, idIndex, nameIndex });

      if (idIndex === -1 || nameIndex === -1) {
        // Try to detect columns by data format in first row
        const firstRow = rows[1].map(col => col.trim());
        console.log('Trying data format detection:', firstRow);

        if (idIndex === -1) {
          idIndex = firstRow.findIndex(col => /^\d{6}$/.test(col));
        }
        if (nameIndex === -1) {
          nameIndex = firstRow.findIndex(col => 
            col.includes(',') && col.split(',').length === 2);
        }

        if (idIndex === -1 || nameIndex === -1) {
          throw new Error('Could not find Student ID and Name columns. Please check your data format.');
        }
      }

      const assignmentNames = headers
        .slice(nameIndex + 1)
        .filter(h => h && !h.toLowerCase()?.includes('cycle'));

      const parsedRows = rows.slice(1)
        .filter(row => row.length >= Math.max(idIndex, nameIndex))
        .map(row => {
          const id = row[idIndex]?.trim() || '';
          const [lastName, firstName] = parseStudentName(row[nameIndex]);
          const grades = row
            .slice(nameIndex + 1)
            .filter((_, i) => !headers[nameIndex + 1 + i]?.toLowerCase()?.includes('cycle'));

          return { id, lastName, firstName, grades };
        });

      const newAssignments = assignmentNames.map((name, index) => {
        // Safely check for existing assignment
        const matchingAssignment = Object.values(existingAssignments)
          .find(a => a.name.toLowerCase() === name?.toLowerCase());

        return {
          name: name?.trim() || `Assignment ${index + 1}`,
          type: matchingAssignment?.type || 'Daily',
          subject: matchingAssignment?.subject || 'Math 8',
          periods: selectedPeriods,
          grades: parsedRows.reduce((acc, row) => {
            if (row.grades[index]?.trim()) {
              acc[row.id] = row.grades[index].trim();
            }
            return acc;
          }, {} as Record<string, string>),
          selected: true,
          date: matchingAssignment?.date || new Date(),
          existingId: matchingAssignment?.id
        };
      });

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
            ...existingAssignment,
            id: a.existingId,
            grades: a.grades,
            // Merge periods to avoid overwriting existing ones
            periods: [...new Set([...existingAssignment.periods, ...selectedPeriods])]
          };
        }
        
        // Otherwise create new assignment
        return {
          ...a,
          periods: selectedPeriods.length ? selectedPeriods : [activeTab].filter(Boolean)
        };
      });

    onImport(assignmentsToImport);
  };

  const canImport = parsedData.length > 0 && selectedPeriods.length > 0 && parsedData.some(a => a.selected);
  console.log('Import button state:', {
    parsedDataLength: parsedData.length,
    selectedPeriodsLength: selectedPeriods.length,
    hasSelectedAssignments: parsedData.some(a => a.selected),
    canImport
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Bulk Import Assignments</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh]" aria-describedby="import-description">
        <DialogHeader>
          <DialogTitle>Bulk Import Assignments</DialogTitle>
          <p id="import-description" className="text-sm text-muted-foreground">
            Import multiple assignments and grades from a spreadsheet. Map to existing assignments or create new ones.
          </p>
        </DialogHeader>
        
        {!parsedData.length ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Select Target Periods:</label>
                <span className="text-sm text-muted-foreground">
                  {selectedPeriods.length ? 
                    `${selectedPeriods.length} period${selectedPeriods.length > 1 ? 's' : ''} selected` : 
                    'Select at least one period'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 p-4 border rounded-md bg-muted/50">
                {availablePeriods.map(period => (
                  <Button
                    key={period}
                    variant={selectedPeriods.includes(period) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedPeriods(prev => 
                        prev.includes(period)
                          ? prev.filter(p => p !== period)
                          : [...prev, period]
                      );
                    }}
                  >
                    Period {period}
                    {period === activeTab && " (Current)"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border rounded p-4">
              <h3 className="text-sm font-medium mb-2">Instructions:</h3>
              <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                <li>Copy and paste your gradebook data</li>
                <li>First row should contain headers</li>
                <li>Must include Student ID and Name columns</li>
                <li>Each additional column will be treated as an assignment</li>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Column Header</TableHead>
                  <TableHead>Assignment Name</TableHead>
                  <TableHead>Map to Existing</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead className="text-right"># Grades</TableHead>
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
                    <TableCell className="text-right">
                      {Object.keys(assignment.grades).length}
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
              setSelectedPeriods(activeTab ? [activeTab] : []); // Reset to initial state
            }}
          >
            Clear
          </Button>
          <Button
            onClick={() => {
              const assignmentsWithPeriods = parsedData
                .filter(a => a.selected)
                .map(a => ({ ...a, periods: selectedPeriods }));
              onImport(assignmentsWithPeriods);
            }}
            disabled={!canImport}
          >
            Import Selected ({parsedData.filter(a => a.selected).length})
            {!selectedPeriods.length && (
              <span className="ml-2 text-xs text-red-500">
                Select periods first
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportDialog;
