'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, ChevronRight, Brain, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react"; // Add Save icon

const CIRCLE_PATH_LENGTH = 2 * Math.PI * 20; // For a circle with r=20

interface StandardScore {
  standard: string;
  correct: number;
  tested: number;
  mastery: number;
}

interface GroupedStandards {
  [key: string]: StandardScore[];
}

interface BenchmarkData {
  score: number;
  performance_level: string;
  standards: StandardScore[];
}

export function BenchmarkScores({ studentId }: { studentId: number }) {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null);
  const [goal, setGoal] = useState("");
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Get the student data first
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      // Then get the benchmark data
      const { data: scoreData, error: scoreError } = await supabase
        .from('benchmark_scores')
        .select('*')
        .eq('student_id', studentId)
        .single();

      const { data: standardsData, error: standardsError } = await supabase
        .from('benchmark_standards')
        .select('*')
        .eq('student_id', studentId);

      if (scoreData && standardsData && studentData) {
        setBenchmarkData({
          score: scoreData.score,
          performance_level: scoreData.performance_level,
          standards: standardsData,
          student_name: studentData.name // Add student name to the display data
        });
      }
    };

    const loadGoal = async () => {
      const { data, error } = await supabase
        .from('student_goals')
        .select('goal_text')
        .eq('student_id', studentId)
        .single();

      if (data) setGoal(data.goal_text);
    };

    loadData();
    loadGoal();
  }, [studentId]);

  const saveGoal = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('student_goals')
      .upsert({
        student_id: studentId,
        goal_text: goal,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id'
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Could not save goal",
        description: "Please try again"
      });
    } else {
      toast({
        title: "Goal saved!",
        description: "Your goal has been updated"
      });
    }
    setIsSaving(false);
  };

  // Use the actual score instead of calculated average
  const score = benchmarkData?.score || 0;
  const performanceLevel = benchmarkData?.performance_level || 'Did Not Meet';

  // Group standards by category (e.g., 8.2, 8.3, etc.)
  const groupedStandards = benchmarkData?.standards.reduce((acc: GroupedStandards, standard) => {
    const category = standard.standard.split('.').slice(0, 2).join('.');
    if (!acc[category]) acc[category] = [];
    acc[category].push(standard);
    return acc;
  }, {}) || {};

  // Find strongest and weakest areas based on correct/tested ratio
  const categoryAverages = Object.entries(groupedStandards).map(([category, standards]) => {
    const totalCorrect = standards.reduce((acc, s) => acc + (s.correct / 100) * s.tested, 0);
    const totalTested = standards.reduce((acc, s) => acc + s.tested, 0);
    return {
      category,
      average: Math.round((totalCorrect / totalTested) * 100) || 0
    };
  }).sort((a, b) => b.average - a.average);

  const strongestAreas = categoryAverages.slice(0, 3);
  const weakestAreas = categoryAverages.slice(-3).reverse();

  const getPerformanceLevelColor = (level: string) => {
    switch (level) {
      case 'Masters':
        return 'bg-blue-500 text-blue-100';
      case 'Meets':
        return 'bg-green-500 text-green-100';
      case 'Approaches':
        return 'bg-yellow-500 text-yellow-900';
      default:
        return 'bg-red-500 text-red-100';
    }
  };

  return (
    <div className="flex gap-6 items-start">
      <Dialog>
        <DialogTrigger asChild>
          <div className="relative w-48 h-48 mx-auto cursor-pointer hover:scale-105 transition-transform">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                className="stroke-zinc-800 fill-none"
                strokeWidth="8"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                className={cn(
                  "stroke-current fill-none transition-all duration-1000",
                  performanceLevel === 'Masters' ? "stroke-blue-500" :
                  performanceLevel === 'Meets' ? "stroke-green-500" :
                  performanceLevel === 'Approaches' ? "stroke-yellow-500" :
                  "stroke-red-500"
                )}
                strokeWidth="8"
                strokeDasharray={`${(score/100) * (2 * Math.PI * 88)} ${2 * Math.PI * 88}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="text-4xl font-bold">{score}%</div>
              <div className={cn(
                "text-sm px-2 py-1 rounded-full",
                getPerformanceLevelColor(performanceLevel)
              )}>
                {performanceLevel}
              </div>
            </div>
          </div>
        </DialogTrigger>
        
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Standards Mastery Breakdown</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Strongest Areas */}
            <Card className="bg-zinc-900">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <CardTitle className="text-lg text-zinc-100">Strongest Areas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {strongestAreas.map(({ category, average }) => (
                    <div key={category} className="flex flex-col items-center">
                      <div className="relative w-16 h-16 mb-2">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            className="stroke-zinc-800 fill-none"
                            strokeWidth="6"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            className={cn(
                              "fill-none transition-all duration-500",
                              average >= 70 ? "stroke-green-500" :
                              average >= 50 ? "stroke-yellow-500" : "stroke-red-500"
                            )}
                            strokeWidth="6"
                            strokeDasharray={`${(average/100) * (2 * Math.PI * 28)} ${2 * Math.PI * 28}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-100">
                          {average}%
                        </span>
                      </div>
                      <span className="text-xs text-zinc-300 text-center">{category}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Areas for Growth - similar structure */}
            <Card className="bg-zinc-900">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <CardTitle className="text-lg text-zinc-100">Areas for Growth</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {weakestAreas.map(({ category, average }) => (
                    <div key={category} className="flex flex-col items-center">
                      <div className="relative w-16 h-16 mb-2">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            className="stroke-zinc-800 fill-none"
                            strokeWidth="6"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            className={cn(
                              "fill-none transition-all duration-500",
                              average >= 70 ? "stroke-green-500" :
                              average >= 50 ? "stroke-yellow-500" : "stroke-red-500"
                            )}
                            strokeWidth="6"
                            strokeDasharray={`${(average/100) * (2 * Math.PI * 28)} ${2 * Math.PI * 28}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-100">
                          {average}%
                        </span>
                      </div>
                      <span className="text-xs text-zinc-300 text-center">{category}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Standards Breakdown */}
            <div className="col-span-2 mt-6">
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">All Standards</h2>
              <div className="grid grid-cols-8 gap-4"> {/* Changed to 8 columns, reduced gap */}
                {benchmarkData?.standards.map((standard) => {
                  const percentage = standard.correct;
                  const ratio = `${Math.round((percentage/100) * standard.tested)}/${standard.tested}`;
                  
                  return (
                    <div key={standard.standard} className="flex flex-col items-center group">
                      <div className="relative w-12 h-12 mb-1"> {/* Reduced size */}
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            className="stroke-zinc-800 fill-none"
                            strokeWidth="4"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            className={cn(
                              "fill-none transition-all duration-500",
                              percentage >= 70 ? "stroke-green-500" :
                              percentage >= 50 ? "stroke-yellow-500" : "stroke-red-500"
                            )}
                            strokeWidth="4"
                            strokeDasharray={`${(percentage/100) * (2 * Math.PI * 20)} ${2 * Math.PI * 20}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-100">
                          {percentage}%
                        </span>
                        {/* Add hover ratio display */}
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium bg-zinc-900/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          {ratio}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-300 text-center">{standard.standard}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 bg-zinc-900 rounded-xl p-4 min-h-[12rem]">
        <div className="flex justify-between items-center mb-2">
          <label 
            htmlFor="goal" 
            className="block text-sm font-medium text-zinc-400"
          >
            My Goal
          </label>
          <Button
            variant="secondary"
            size="sm"
            onClick={saveGoal}
            disabled={isSaving}
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Goal
              </>
            )}
          </Button>
        </div>
        <Textarea
          id="goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Write your goal here..."
          className="min-h-[120px] bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
        />
      </div>
    </div>
  );
}
