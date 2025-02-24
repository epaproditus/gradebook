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
import { teksCategories, getTeksCategory, getTeksDescription } from '@/lib/teksData';

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

const CircleProgress = ({ percentage, size = 48, strokeWidth = 4 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg className="transform -rotate-90 w-full h-full">
      <circle
        cx={size/2}
        cy={size/2}
        r={radius}
        className="stroke-zinc-800 fill-none"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size/2}
        cy={size/2}
        r={radius}
        className={cn(
          "fill-none transition-all duration-500",
          percentage >= 70 ? "stroke-green-500" :
          percentage >= 50 ? "stroke-yellow-500" : "stroke-red-500"
        )}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
};

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

  // Group standards by TEKS category
  const standardsByCategory = benchmarkData?.standards.reduce((acc, standard) => {
    const category = getTeksCategory(standard.standard);
    if (!acc[category]) acc[category] = [];
    acc[category].push({
      ...standard,
      description: getTeksDescription(standard.standard)
    });
    return acc;
  }, {} as Record<string, any[]>) || {};

  // Find strongest and weakest areas based on correct/tested ratio
  const categoryAverages = Object.entries(standardsByCategory).map(([category, standards]) => {
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
            <div className="col-span-2 space-y-6">
              {Object.entries(standardsByCategory).map(([category, standards]) => (
                <Card key={category} className="bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="text-lg text-zinc-100">
                      {teksCategories[category]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-6 gap-4">
                      {standards.map((standard) => (
                        <div 
                          key={standard.standard} 
                          className="flex flex-col items-center group"
                          title={standard.description} // Show description on hover
                        >
                          <div className="relative w-12 h-12 mb-1">
                            <CircleProgress percentage={standard.correct} />
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-100">
                              {standard.correct}%
                            </span>
                            {/* Add hover ratio display */}
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium bg-zinc-900/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                              {Math.round((standard.correct/100) * standard.tested)}/{standard.tested}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-300 text-center">
                            {standard.standard}
                          </span>
                          {/* Add tooltip with description */}
                          <div className="hidden group-hover:block absolute z-50 p-2 bg-zinc-800 rounded-md shadow-lg max-w-xs mt-16">
                            {standard.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
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
