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
import { teksCategories, getTeksCategory } from '@/lib/teksData';
import { BenchmarkScores } from './BenchmarkScores';

function formatPeriod(period: string) {
  const num = parseInt(period);
  const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
  return `${num}${suffix} Period`;
}

export function TeacherBenchmark() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('none');
  const [customGroups, setCustomGroups] = useState<Record<string, number[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
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

  // Sort function for students by score
  const sortStudentsByScore = (a: any, b: any) => {
    const scoreA = a.benchmark_scores?.[0]?.score || 0;
    const scoreB = b.benchmark_scores?.[0]?.score || 0;
    return scoreB - scoreA; // Highest first
  };

  // Group students by period first, then by performance level
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
  }, {});

  // Sort students within each performance level
  Object.values(studentsByPeriod).forEach(periodData => {
    Object.values(periodData).forEach(students => {
      students.sort(sortStudentsByScore);
    });
  });

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
                              <CircleProgress 
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
    </div>
  );
}

function CircleProgress({ percentage, performanceLevel }: { percentage: number, performanceLevel: string }) {
  const radius = 60; // Increased radius for larger circles
  const circumference = 2 * Math.PI * radius;
  
  return (
    <svg className="w-full h-full transform -rotate-90">
      <circle
        cx="64"
        cy="64"
        r={radius}
        className="stroke-zinc-800 fill-none"
        strokeWidth="8" // Increased from 4 to 8
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
        strokeWidth="8" // Increased from 4 to 8
        strokeDasharray={`${(percentage/100) * circumference} ${circumference}`}
        strokeLinecap="round"
      />
    </svg>
  );
}
