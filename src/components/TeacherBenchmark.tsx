'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Brain, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { teksCategories, getTeksCategory, getTeksDescription } from '@/lib/teksData';
import { BenchmarkScores } from './BenchmarkScores';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

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

function normalizePeriod(period: string) {
  // Extract just the numeric part from the period
  const match = period.match(/^(\d+)/);
  return match ? match[1] : period;
}

function formatPeriod(period: string) {
  // Get just the number
  const num = parseInt(normalizePeriod(period));
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
  const [categoryCollapsed, setCategoryCollapsed] = useState<Record<string, boolean>>({});
  const [standardsCollapsed, setStandardsCollapsed] = useState<Record<string, boolean>>({});
  const [periodsCollapsed, setPeriodsCollapsed] = useState<Record<string, boolean>>({});
  const [topStatsCollapsed, setTopStatsCollapsed] = useState<Record<string, boolean>>({
    mastered: false,
    growth: false
  });
  const supabase = createClientComponentClient();

  const toggleTopStats = (section: 'mastered' | 'growth') => {
    setTopStatsCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

  // Load persisted states after mount
  useEffect(() => {
    const savedView = localStorage.getItem('benchmarkView') as 'students' | 'standards';
    if (savedView) setView(savedView);

    const savedCategory = localStorage.getItem('categoryCollapsed');
    if (savedCategory) setCategoryCollapsed(JSON.parse(savedCategory));

    const savedStandards = localStorage.getItem('standardsCollapsed');
    if (savedStandards) setStandardsCollapsed(JSON.parse(savedStandards));

    const savedPeriods = localStorage.getItem('periodsCollapsed');
    if (savedPeriods) setPeriodsCollapsed(JSON.parse(savedPeriods));

    const savedTopStats = localStorage.getItem('topStatsCollapsed');
    if (savedTopStats) setTopStatsCollapsed(JSON.parse(savedTopStats));
  }, []);

  // Persist view changes
  useEffect(() => {
    localStorage.setItem('benchmarkView', view);
  }, [view]);

  // Persist collapse states
  useEffect(() => {
    localStorage.setItem('categoryCollapsed', JSON.stringify(categoryCollapsed));
  }, [categoryCollapsed]);

  useEffect(() => {
    localStorage.setItem('standardsCollapsed', JSON.stringify(standardsCollapsed));
  }, [standardsCollapsed]);

  useEffect(() => {
    localStorage.setItem('periodsCollapsed', JSON.stringify(periodsCollapsed));
  }, [periodsCollapsed]);

  useEffect(() => {
    localStorage.setItem('topStatsCollapsed', JSON.stringify(topStatsCollapsed));
  }, [topStatsCollapsed]);

  // Add function to initialize collapse state for new standards
  const getInitialCollapseState = (id: string, stateObj: Record<string, boolean>) => {
    if (typeof stateObj[id] === 'boolean') {
      return stateObj[id];
    }
    return true; // Default to collapsed
  };

  // Filter students based on period and search
  const filteredStudents = students.filter(student => {
    const matchesPeriod = selectedPeriod === 'all' || 
      normalizePeriod(student.class_period) === selectedPeriod;
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
    const period = normalizePeriod(student.class_period);
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

    // Group by category first, then separate by readiness/supporting within each category
    const byCategory = Object.values(standardsMap).reduce((acc, item) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = {
          readiness: [],
          supporting: []
        };
      }
      if (item.isReporting) {
        acc[category].readiness.push(item);
      } else {
        acc[category].supporting.push(item);
      }
      return acc;
    }, {} as Record<string, { readiness: typeof standardsMap[string][]; supporting: typeof standardsMap[string][] }>);

    return byCategory;
  };

  // Add new function to get all unique periods
  const getAllPeriods = () => {
    const periodSet = new Set(students.map(student => normalizePeriod(student.class_period)));
    return Array.from(periodSet).sort((a, b) => parseInt(a) - parseInt(b));
  };

  // Modify the overall mastery stats function to focus on standards
  const getOverallMasteryStats = (standardsView: ReturnType<typeof getStandardsView>) => {
    const allStandards = Object.values(standardsView).flatMap(category => [
      ...category.readiness,
      ...category.supporting
    ]).map(standard => {
      const totalStudents = standard.students.length;
      const mastersCount = standard.students.filter(s => s.mastery >= 77).length;
      const mastersPercent = Math.round((mastersCount / totalStudents) * 100);
      
      return {
        standard: standard.standard,
        description: standard.description,
        isReporting: standard.isReporting,
        mastersPercent,
        totalStudents
      };
    });

    // Find best and worst performing standards
    const masteredStandards = allStandards
      .filter(s => s.mastersPercent >= 50) // Show standards where at least 50% of students mastered
      .sort((a, b) => b.mastersPercent - a.mastersPercent)
      .slice(0, 5);

    const growthStandards = allStandards
      .filter(s => s.mastersPercent < 50)
      .sort((a, b) => a.mastersPercent - b.mastersPercent)
      .slice(0, 5);

    return { masteredStandards, growthStandards };
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Benchmark Results</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select period..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              {getAllPeriods().map(period => (
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
            className="w-full sm:w-[200px]"
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
                <Collapsible
                  key={period}
                  open={!getInitialCollapseState(period, periodsCollapsed)}
                  onOpenChange={(isOpen) => 
                    setPeriodsCollapsed(prev => ({ ...prev, [period]: !isOpen }))
                  }
                >
                  <Card>
                    <CardHeader>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-semibold">{formatPeriod(period)}</h2>
                          {!periodsCollapsed[period] ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronUp className="h-4 w-4" />
                          }
                        </div>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="standards">
          {/* Updated Overall Mastery Stats at top */}
          {(() => {
            const standardsView = getStandardsView();
            const { masteredStandards, growthStandards } = getOverallMasteryStats(standardsView);
            
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Mastered Standards */}
                <Card>
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => toggleTopStats('mastered')}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-green-500">
                        <Award className="h-5 w-5" />
                        <span>Highest Performing Standards</span>
                      </CardTitle>
                      {topStatsCollapsed.mastered ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronUp className="h-4 w-4" />
                      }
                    </div>
                  </CardHeader>
                  <div className={cn(
                    "transition-all",
                    topStatsCollapsed.mastered ? "hidden" : "block"
                  )}>
                    <CardContent>
                      <div className="space-y-4">
                        {masteredStandards.map(standard => (
                          <div key={standard.standard} className="space-y-2">
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-medium">
                                {standard.standard}
                                <span className={cn(
                                  "ml-2 text-xs px-2 py-0.5 rounded-full whitespace-nowrap",
                                  standard.isReporting 
                                    ? "bg-blue-500/10 text-blue-500" 
                                    : "bg-yellow-500/10 text-yellow-500"
                                )}>
                                  {standard.isReporting ? 'Readiness' : 'Supporting'}
                                </span>
                              </span>
                              <span className="font-medium text-green-500 whitespace-nowrap">
                                {standard.mastersPercent}% Mastery
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {standard.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </div>
                </Card>

                {/* Areas for Growth */}
                <Card>
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => toggleTopStats('growth')}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-yellow-500">
                        <Target className="h-5 w-5" />
                        <span>Standards Needing Growth</span>
                      </CardTitle>
                      {topStatsCollapsed.growth ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronUp className="h-4 w-4" />
                      }
                    </div>
                  </CardHeader>
                  <div className={cn(
                    "transition-all",
                    topStatsCollapsed.growth ? "hidden" : "block"
                  )}>
                    <CardContent>
                      <div className="space-y-4">
                        {growthStandards.map(standard => (
                          <div key={standard.standard} className="space-y-2">
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-medium">
                                {standard.standard}
                                <span className={cn(
                                  "ml-2 text-xs px-2 py-0.5 rounded-full whitespace-nowrap",
                                  standard.isReporting 
                                    ? "bg-blue-500/10 text-blue-500" 
                                    : "bg-yellow-500/10 text-yellow-500"
                                )}>
                                  {standard.isReporting ? 'Readiness' : 'Supporting'}
                                </span>
                              </span>
                              <span className="font-medium text-yellow-500 whitespace-nowrap">
                                {standard.mastersPercent}% Mastery
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {standard.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* Standards view - remove mastery/growth sections from individual standards */}
          <div className="space-y-8">
            {Object.entries(getStandardsView()).map(([category, standards]) => (
              <Collapsible key={category}>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <CardTitle>{teksCategories[category]}</CardTitle>
                        {categoryCollapsed[category] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-6">
                      {/* Readiness Standards */}
                      {standards.readiness.length > 0 && (
                        <div>
                          <h3 className="text-sm mb-3 font-bold text-blue-500">
                            Readiness Standards
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {standards.readiness.map(({ standard, description, students }) => {
                              // Calculate performance level percentages
                              const totalStudents = students.length;
                              const mastersCount = students.filter(s => s.mastery >= 77).length;
                              const meetsCount = students.filter(s => s.mastery >= 54 && s.mastery < 77).length;
                              const approachesCount = students.filter(s => s.mastery >= 38 && s.mastery < 54).length;
                              
                              const mastersPercent = Math.round((mastersCount / totalStudents) * 100);
                              const meetsPercent = Math.round((meetsCount / totalStudents) * 100);
                              const approachesPercent = Math.round((approachesCount / totalStudents) * 100);

                              return (
                                <Collapsible key={standard}>
                                  <Card className="overflow-visible">
                                    <CardHeader className="p-3">
                                      <CollapsibleTrigger className="w-full">
                                        <CardTitle className="flex flex-col gap-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium text-sm leading-none">{standard}</span>
                                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                                                Readiness
                                              </span>
                                            </div>
                                            {!standardsCollapsed[standard] ? 
                                              <ChevronDown className="h-4 w-4 shrink-0" /> : 
                                              <ChevronUp className="h-4 w-4 shrink-0" />
                                            }
                                          </div>
                                          <p className="text-sm text-muted-foreground text-left hover:whitespace-normal">
                                            {description}
                                          </p>
                                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1 border-t pt-2">
                                            <div className="flex gap-3">
                                              <span className="text-blue-500 font-medium">
                                                {mastersPercent}% Masters
                                              </span>
                                              <span className="text-green-500 font-medium">
                                                {meetsPercent}% Meets
                                              </span>
                                              <span className="text-yellow-500 font-medium">
                                                {approachesPercent}% Approaches
                                              </span>
                                            </div>
                                          </div>
                                        </CardTitle>
                                      </CollapsibleTrigger>
                                    </CardHeader>
                                    <CollapsibleContent>
                                      <CardContent className="p-3">
                                        {/* Only keep the all students grid view */}
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
                                    </CollapsibleContent>
                                  </Card>
                                </Collapsible>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Supporting Standards */}
                      {standards.supporting.length > 0 && (
                        <div>
                          <h3 className="text-sm mb-3 font-bold text-yellow-500">
                            Supporting Standards
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {standards.supporting.map(({ standard, description, students }) => {
                              // Calculate performance level percentages for supporting standards
                              const totalStudents = students.length;
                              const mastersCount = students.filter(s => s.mastery >= 77).length;
                              const meetsCount = students.filter(s => s.mastery >= 54 && s.mastery < 77).length;
                              const approachesCount = students.filter(s => s.mastery >= 38 && s.mastery < 54).length;
                              
                              const mastersPercent = Math.round((mastersCount / totalStudents) * 100);
                              const meetsPercent = Math.round((meetsCount / totalStudents) * 100);
                              const approachesPercent = Math.round((approachesCount / totalStudents) * 100);
                              const averageMastery = Math.round(
                                students.reduce((sum, s) => sum + s.mastery, 0) / totalStudents
                              );
                              const masteredCount = students.filter(s => s.mastery >= 70).length;

                              return (
                                <Collapsible key={standard}>
                                  <Card className="overflow-visible">
                                    <CardHeader className="p-3">
                                      <CollapsibleTrigger className="w-full">
                                        <CardTitle className="flex flex-col gap-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium text-sm leading-none">{standard}</span>
                                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500">
                                                Supporting
                                              </span>
                                            </div>
                                            {!standardsCollapsed[standard] ? 
                                              <ChevronDown className="h-4 w-4 shrink-0" /> : 
                                              <ChevronUp className="h-4 w-4 shrink-0" />
                                            }
                                          </div>
                                          <p className="text-sm text-muted-foreground text-left hover:whitespace-normal">
                                            {description}
                                          </p>
                                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1 border-t pt-2">
                                            <div className="flex gap-3">
                                              <span className="text-blue-500 font-medium">
                                                {mastersPercent}% Masters
                                              </span>
                                              <span className="text-green-500 font-medium">
                                                {meetsPercent}% Meets
                                              </span>
                                              <span className="text-yellow-500 font-medium">
                                                {approachesPercent}% Approaches
                                              </span>
                                            </div>
                                          </div>
                                        </CardTitle>
                                      </CollapsibleTrigger>
                                    </CardHeader>
                                    <CollapsibleContent>
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
                                    </CollapsibleContent>
                                  </Card>
                                </Collapsible>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
