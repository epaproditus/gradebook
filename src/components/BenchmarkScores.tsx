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
      // Get the overall score first
      const { data: scoreData, error: scoreError } = await supabase
        .from('benchmark_scores')
        .select('*')
        .eq('student_id', studentId)
        .single();

      // Then get the standards breakdown
      const { data: standardsData, error: standardsError } = await supabase
        .from('benchmark_standards')
        .select('*')
        .eq('student_id', studentId);

      if (scoreData && standardsData) {
        setBenchmarkData({
          score: scoreData.score,
          performance_level: scoreData.performance_level,
          standards: standardsData
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

  // Find strongest and weakest areas
  const categoryAverages = Object.entries(groupedStandards).map(([category, standards]) => ({
    category,
    average: Math.round(standards.reduce((acc, s) => acc + s.mastery, 0) / standards.length)
  })).sort((a, b) => b.average - a.average);

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
        
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Standards Mastery Breakdown</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Strongest Areas */}
            <Card className="bg-zinc-900">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <CardTitle className="text-lg">Strongest Areas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {strongestAreas.map(({ category, average }) => (
                  <div key={category} className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span>Standard {category}</span>
                      <span>{average}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${average}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Weakest Areas */}
            <Card className="bg-zinc-900">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <CardTitle className="text-lg">Areas for Growth</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {weakestAreas.map(({ category, average }) => (
                  <div key={category} className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span>Standard {category}</span>
                      <span>{average}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div
                        className="bg-red-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${average}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Detailed Standards Breakdown */}
            <div className="col-span-2 space-y-4">
              {Object.entries(groupedStandards).map(([category, standards]) => (
                <Card key={category} className="bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="text-lg">Standard {category}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {standards.map((standard) => (
                      <div key={standard.standard}>
                        <div className="flex justify-between mb-1">
                          <span>{standard.standard}</span>
                          <span>
                            {standard.correct}/{standard.tested} ({standard.mastery}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              standard.mastery >= 70 ? "bg-green-500" :
                              standard.mastery >= 50 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${standard.mastery}%` }}
                          />
                        </div>
                      </div>
                    ))}
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
