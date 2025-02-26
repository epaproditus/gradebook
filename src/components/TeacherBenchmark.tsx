'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Brain, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { teksCategories, getTeksCategory, getTeksDescription } from '@/lib/teksData';
import { BenchmarkScores } from './BenchmarkScores';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface StandardScore {
  standard: string;
  correct: number;
  tested: number;
  mastery: number;
  test_date: string;
}

interface Student {
  id: number;
  name: string;
  class_period: string;
  benchmark_scores: Array<{
    score: number;
    performance_level: string;
  }>;
  benchmark_standards: StandardScore[];
}

// Update period formatting function
function formatPeriod(period: string) {
  // Handle special cases like "1st SPED"
  const match = period.match(/(\d+)(?:st|nd|rd|th)?\s*(.+)?/i);
  if (!match) return period;

  const [_, num, suffix] = match;
  const ordinal = nth(parseInt(num));
  return suffix ? `${ordinal} ${suffix}` : ordinal;
}

// Add ordinal helper function
function nth(n: number): string {
  return n + (['st', 'nd', 'rd'][((n + 90) % 100 - 10) % 10 - 1] || 'th');
}

// Separate circle components for different views
function StudentCircle({ percentage, performanceLevel }: { percentage: number, performanceLevel: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  return (
    <svg className="w-full h-full transform -rotate-90">
      <circle
        cx="64"
        cy="64"
        r={radius}
        className="stroke-zinc-800 fill-none"
        strokeWidth="8"
      />
      <circle
        cx="64"
        cy="64"
        r={radius}
        className={cn(
          "fill-none transition-all duration-500",
          performanceLevel === 'Masters' ? "stroke-blue-500" :
          performanceLevel === 'Meets' ? "stroke-green-500" :
          performanceLevel === 'Approaches' ? "stroke-yellow-500" :
          "stroke-red-500"
        )}
        strokeWidth="8"
        strokeDasharray={`${(percentage/100) * circumference} ${circumference}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function StandardCircle({ percentage }: { percentage: number }) {
  // Reduce size further for better fit
  const radius = 16; // Reduced from 24
  const circumference = 2 * Math.PI * radius;
  
  return (
    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40"> // Added viewBox
      <circle
        cx="20" // Centered in viewBox
        cy="20"
        r={radius}
        className="stroke-zinc-800 fill-none"
        strokeWidth="4" // Reduced from 6
      />
      <circle
        cx="20"
        cy="20"
        r={radius}
        className={cn(
          "fill-none transition-all duration-500",
          percentage >= 70 ? "stroke-green-500" :
          percentage >= 50 ? "stroke-yellow-500" :
          "stroke-red-500"
        )}
        strokeWidth="4"
        strokeDasharray={`${(percentage/100) * circumference} ${circumference}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TeacherBenchmark() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('none');
  const [customGroups, setCustomGroups] = useState<Record<string, number[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'students' | 'standards'>('students');
  const [selectedTeks, setSelectedTeks] = useState<string[]>([]);
  const supabase = createClientComponentClient();

  // Load students and their benchmark data
  useEffect(() => {
    const loadData = async () => {
      const { data: studentData } = await supabase
        .from('students')
        .select(`
          *,
          benchmark_scores (*),
          benchmark_standards (*)
        `);

      if (studentData) {
        setStudents(studentData);
      }
    };

    loadData();
  }, []);

  // Get unique TEKS from all students
  const allTeks = useMemo(() => {
    const teksSet = new Set<string>();
    students.forEach(student => {
      student.benchmark_standards?.forEach(standard => {
        teksSet.add(standard.standard);
      });
    });
    return Array.from(teksSet).sort();
  }, [students]);

  // Filter students based on period, search, group, and TEKS
  const filteredStudents = students.filter(student => {
    const matchesPeriod = selectedPeriod === 'all' || student.class_period === selectedPeriod;
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'none' || customGroups[selectedGroup]?.includes(student.id);
    const matchesTeks = selectedTeks.length === 0 || 
      student.benchmark_standards?.some(standard => 
        selectedTeks.includes(standard.standard)
      );
    return matchesPeriod && matchesSearch && matchesGroup && matchesTeks;
  });

  // Update the sorting function to consider standards
  const sortStudentsByPerformance = (a: Student, b: Student) => {
    // First sort by overall score
    const scoreA = a.benchmark_scores?.[0]?.score || 0;
    const scoreB = b.benchmark_scores?.[0]?.score || 0;
    
    if (scoreB !== scoreA) return scoreB - scoreA;
    
    // If scores are equal, sort by number of mastered standards
    const masteredA = a.benchmark_standards?.filter(s => s.mastery >= 70).length || 0;
    const masteredB = b.benchmark_standards?.filter(s => s.mastery >= 70).length || 0;
    
    return masteredB - masteredA;
  };

  // Group students by period and performance level
  const studentsByPeriod = filteredStudents.reduce((acc, student) => {
    const period = student.class_period;
    if (!acc[period]) {
      acc[period] = {
        Masters: [],
        Meets: [],
        Approaches: [],
        'Did Not Meet': []
      };
    }
    const level = student.benchmark_scores?.[0]?.performance_level || 'Did Not Meet';
    acc[period][level].push(student);
    return acc;
  }, {} as Record<string, Record<string, Student[]>>);

  // Sort students within each performance level
  Object.values(studentsByPeriod).forEach(periodData => {
    Object.values(periodData).forEach(students => {
      students.sort(sortStudentsByPerformance);
    });
  });

  // New function to group by standards
  const getStandardsView = () => {
    const standardsMap: Record<string, {
      category: string;
      standard: string;
      description: string;
      isReporting: boolean;
      students: Array<{
        id: number;
        name: string;
        score: number;
        mastery: number;
        tested: number;
      }>;
    }> = {};

    // Filter students first
    const studentsToShow = students.filter(student => {
      const matchesPeriod = selectedPeriod === 'all' || student.class_period === selectedPeriod;
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPeriod && matchesSearch;
    });

    studentsToShow.forEach(student => {
      student.benchmark_standards?.forEach(standard => {
        // Only include selected TEKS or all if none selected
        if (selectedTeks.length > 0 && !selectedTeks.includes(standard.standard)) {
          return;
        }

        // Rest of the grouping logic
        if (!standardsMap[standard.standard]) {
          standardsMap[standard.standard] = {
            category: getTeksCategory(standard.standard),
            standard: standard.standard,
            description: getTeksDescription(standard.standard),
            isReporting: standard.tested === 2,
            students: []
          };
        }
        
        standardsMap[standard.standard].students.push({
          id: student.id,
          name: student.name,
          score: student.benchmark_scores?.[0]?.score || 0,
          mastery: standard.mastery,
          tested: standard.tested
        });
      });
    });

    // Group standards by category
    const byCategory = Object.values(standardsMap).reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof standardsMap[string][]>);

    return byCategory;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Benchmark Results</h1>
        <div className="flex gap-4">
          {/* Add TEKS filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                Filter TEKS ({selectedTeks.length})
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2 max-h-80 overflow-y-auto p-2">
                {allTeks.map(teks => (
                  <div key={teks} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTeks.includes(teks)}
                      onCheckedChange={(checked) => {
                        setSelectedTeks(prev => 
                          checked 
                            ? [...prev, teks]
                            : prev.filter(t => t !== teks)
                        );
                      }}
                    />
                    <span className="text-sm">
                      {teks} - {getTeksDescription(teks)}
                    </span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              {Object.keys(studentsByPeriod)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(period => (
                  <SelectItem key={period} value={period}>
                    {formatPeriod(period)}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[200px]"
          />
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'students' | 'standards')}>
        <TabsList>
          <TabsTrigger value="students">By Student</TabsTrigger>
          <TabsTrigger value="standards">By Standard</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <div className="space-y-8">
            {Object.entries(studentsByPeriod)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([period, levels]) => (
                <div key={period} className="space-y-4">
                  <h2 className="text-xl font-semibold">{formatPeriod(period)}</h2>
                  <div className="grid grid-cols-6 gap-4">
                    {Object.entries(levels)
                      .flatMap(([level, students]) =>
                        students.map(student => (
                          <Dialog key={student.id}>
                            <DialogTrigger asChild>
                              <div className="cursor-pointer group/circle">
                                <div className="relative w-32 h-32 mx-auto transition-all duration-200">
                                  <div className="peer">
                                    <StudentCircle 
                                      percentage={student.benchmark_scores?.[0]?.score || 0} 
                                      performanceLevel={student.benchmark_scores?.[0]?.performance_level}
                                    />
                                  </div>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                                    <span className="text-lg font-bold">
                                      {student.benchmark_scores?.[0]?.score || 0}%
                                    </span>
                                    <span className="text-xs text-muted-foreground line-clamp-2 group-hover:text-primary">
                                      {student.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {student.benchmark_standards?.filter(s => s.mastery >= 70).length || 0}/{student.benchmark_standards?.length || 0} Standards
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>{student.name} - Benchmark Details</DialogTitle>
                              </DialogHeader>
                              <BenchmarkScores studentId={student.id} />
                            </DialogContent>
                          </Dialog>
                        ))
                    )}
                  </div>
                </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="standards">
          <div className="space-y-8">
            {Object.entries(getStandardsView()).map(([category, standards]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle>{teksCategories[category]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {standards.map(({ standard, description, isReporting, students }) => (
                      <Card key={standard} className="h-full">
                        <CardHeader className="p-4">
                          <CardTitle className="text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span>{standard}</span>
                              <span className={cn(
                                "text-xs px-2 py-1 rounded-full",
                                isReporting 
                                  ? "bg-blue-500/10 text-blue-500" 
                                  : "bg-yellow-500/10 text-yellow-500"
                              )}>
                                {isReporting ? 'Reporting' : 'Supporting'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {description}
                            </p>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="grid grid-cols-8 gap-1"> {/* Increased columns, reduced gap */}
                            {students
                              .sort((a, b) => b.mastery - a.mastery)
                              .map(student => (
                                <div 
                                  key={student.id}
                                  className="flex flex-col items-center"
                                >
                                  <div className="w-8 h-8"> {/* Reduced from w-10 h-10 */}
                                    <StandardCircle percentage={student.mastery} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-[8px] font-bold"> {/* Reduced font size */}
                                        {student.mastery}%
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[8px] text-muted-foreground text-center mt-0.5">
                                    {student.name.split(',')[1]}
                                  </span>
                                </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
