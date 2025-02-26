'use client';

import { useState, useEffect } from 'react';
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

function formatPeriod(period: string) {
  const num = parseInt(period);
  const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
  return `${num}${suffix} Period`;
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
  const radius = 5; // Small radius for the compact view
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);
  
  return (
    <svg 
      className="w-full h-full"
      viewBox="0 0 12 12"
    >
      <g transform="rotate(-90 6 6)">
        <circle
          cx="6"
          cy="6"
          r={radius}
          className="stroke-zinc-800 fill-none"
          strokeWidth="1.5"
          style={{ opacity: 0.2 }}
        />
        <circle
          cx="6"
          cy="6"
          r={radius}
          className={cn(
            "fill-none transition-all duration-500",
            percentage >= 70 ? "stroke-green-500" :
            percentage >= 50 ? "stroke-yellow-500" :
            "stroke-red-500"
          )}
          strokeWidth="1.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </g>
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

  // Filter students based on period and search
  const filteredStudents = students.filter(student => {
    const matchesPeriod = selectedPeriod === 'all' || student.class_period === selectedPeriod;
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = selectedGroup === 'none' || customGroups[selectedGroup]?.includes(student.id);
    return matchesPeriod && matchesSearch && matchesGroup;
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

    // Group all students' performance by standard
    filteredStudents.forEach(student => {
      student.benchmark_standards?.forEach(standard => {
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
                              <div className="cursor-pointer group">
                                <div className="relative w-32 h-32 mx-auto">
                                  <StudentCircle 
                                    percentage={student.benchmark_scores?.[0]?.score || 0} 
                                    performanceLevel={student.benchmark_scores?.[0]?.performance_level}
                                  />
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
                  <div className="grid grid-cols-3 gap-3">
                    {standards.map(({ standard, description, isReporting, students }) => (
                      <Card key={standard} className="overflow-hidden">
                        <CardHeader className="p-3">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{standard}</span>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-muted-foreground flex-1 truncate">
                              {description}
                            </span>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full whitespace-nowrap",
                              isReporting 
                                ? "bg-blue-500/10 text-blue-500" 
                                : "bg-yellow-500/10 text-yellow-500"
                            )}>
                              {isReporting ? 'Reporting' : 'Supporting'}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                          <div className="grid grid-cols-6 gap-2">
                            {students
                              .sort((a, b) => b.mastery - a.mastery)
                              .map(student => (
                                <div 
                                  key={student.id}
                                  className="flex flex-col items-center gap-1"
                                >
                                  <div className="relative w-12 h-12">
                                    <StandardCircle percentage={student.mastery} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-xs font-bold">
                                        {student.mastery}%
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[9px] text-muted-foreground text-center truncate w-full">
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
