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

  // Group students by performance level
  const studentsByLevel = {
    Masters: filteredStudents.filter(s => s.benchmark_scores?.[0]?.performance_level === 'Masters'),
    Meets: filteredStudents.filter(s => s.benchmark_scores?.[0]?.performance_level === 'Meets'),
    Approaches: filteredStudents.filter(s => s.benchmark_scores?.[0]?.performance_level === 'Approaches'),
    'Did Not Meet': filteredStudents.filter(s => s.benchmark_scores?.[0]?.performance_level === 'Did Not Meet')
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
              {Array.from(new Set(students.map(s => s.class_period))).sort().map(period => (
                <SelectItem key={period} value={period}>Period {period}</SelectItem>
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

      <div className="grid grid-cols-4 gap-6 mb-6">
        {Object.entries(studentsByLevel).map(([level, students]) => (
          <Card key={level}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{level}</span>
                <span>{students.length}</span>
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {filteredStudents.map(student => (
          <Dialog key={student.id}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">{student.name}</h3>
                      <p className="text-sm text-muted-foreground">Period {student.class_period}</p>
                    </div>
                    <div className="relative w-16 h-16">
                      <CircleProgress 
                        percentage={student.benchmark_scores?.[0]?.score || 0} 
                        performanceLevel={student.benchmark_scores?.[0]?.performance_level}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{student.name} - Benchmark Details</DialogTitle>
              </DialogHeader>
              <BenchmarkScores studentId={student.id} />
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}

function CircleProgress({ percentage, performanceLevel }: { percentage: number, performanceLevel: string }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  
  return (
    <svg className="w-full h-full transform -rotate-90">
      <circle
        cx="32"
        cy="32"
        r={radius}
        className="stroke-zinc-800 fill-none"
        strokeWidth="4"
      />
      <circle
        cx="32"
        cy="32"
        r={radius}
        className={cn(
          "fill-none transition-all duration-500",
          performanceLevel === 'Masters' ? "stroke-blue-500" :
          performanceLevel === 'Meets' ? "stroke-green-500" :
          performanceLevel === 'Approaches' ? "stroke-yellow-500" :
          "stroke-red-500"
        )}
        strokeWidth="4"
        strokeDasharray={`${(percentage/100) * circumference} ${circumference}`}
        strokeLinecap="round"
      />
    </svg>
  );
}
