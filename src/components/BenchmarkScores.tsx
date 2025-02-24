'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, ChevronRight, Brain, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
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

interface StandardWithDescription extends StandardScore {
  description?: string;
  isExpanded?: boolean;
}

// Add interface for grouped standards
interface StandardsGroup {
  reporting: StandardWithDescription[];
  supporting: StandardWithDescription[];
}

// Modify CircleProgress component to handle different sizes
const CircleProgress = ({ percentage, size = 48, strokeWidth = 4 }) => {
  return (
    <div className="w-12 h-12"> {/* Fixed size container */}
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx="24"
          cy="24"
          r="20"
          className="stroke-zinc-800 fill-none"
          strokeWidth={strokeWidth}
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
          strokeWidth={strokeWidth}
          strokeDasharray={`${(percentage/100) * CIRCLE_PATH_LENGTH} ${CIRCLE_PATH_LENGTH}`}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

// Add helper function to sort TEKS standards
function sortTeksStandards(a: StandardWithDescription, b: StandardWithDescription) {
  // Extract numbers from standards (e.g., "8.2C" -> [8, 2, "C"])
  const [aNum, aSub, aLetter] = a.standard.match(/(\d+)\.(\d+)([A-Z])/)?.slice(1) || [];
  const [bNum, bSub, bLetter] = b.standard.match(/(\d+)\.(\d+)([A-Z])/)?.slice(1) || [];
  
  // Compare main numbers first
  if (aNum !== bNum) return parseInt(aNum) - parseInt(bNum);
  // Then sub-numbers
  if (aSub !== bSub) return parseInt(aSub) - parseInt(bSub);
  // Finally letters
  return aLetter.localeCompare(bLetter);
}

export function BenchmarkScores({ studentId }: { studentId: number }) {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null);
  const [goal, setGoal] = useState("");
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null);

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
    if (!acc[category]) {
      acc[category] = {
        reporting: [],
        supporting: []
      };
    }
    
    const standardWithDesc = {
      ...standard,
      description: getTeksDescription(standard.standard),
      isExpanded: standard.standard === expandedDetail
    };
  
    // Sort into reporting (tested=2) or supporting (tested=1) groups
    if (standard.tested === 2) {
      acc[category].reporting.push(standardWithDesc);
    } else {
      acc[category].supporting.push(standardWithDesc);
    }
  
    // Sort each group separately
    acc[category].reporting.sort(sortTeksStandards);
    acc[category].supporting.sort(sortTeksStandards);
    
    return acc;
  }, {} as Record<string, StandardsGroup>) || {};

  // Modify the strongest/weakest calculation
  const standardsList = Object.entries(standardsByCategory).flatMap(([category, groups]) => {
    return [...groups.reporting, ...groups.supporting].map(standard => ({
      category,
      ...standard,
      description: getTeksDescription(standard.standard)
    }));
  });

  const strongestStandards = standardsList
    .filter(s => s.correct === 100)
    .sort((a, b) => b.tested - a.tested)
    .slice(0, 4);

  const weakestStandards = standardsList
    .filter(s => s.correct < 70)
    .sort((a, b) => a.correct - b.correct)
    .slice(0, 4);

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

  // Modify the summary standards mapping to use expandedSummary
  const summaryStandards = standardsList.map(standard => ({
    ...standard,
    isExpanded: standard.standard === expandedSummary
  }));

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
                  <CardTitle className="text-lg text-zinc-100">Mastered Standards</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {strongestStandards.map((standard) => (
                    <div key={standard.standard} className="flex flex-col items-center">
                      <div className="relative w-12 h-12 mb-1">
                        <CircleProgress percentage={standard.correct} />
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-100">
                          {standard.correct}%
                        </span>
                      </div>
                      <span className="text-xs text-zinc-300 text-center">{standard.standard}</span>
                      <button
                        onClick={() => setExpandedSummary(
                          expandedSummary === standard.standard ? null : standard.standard
                        )}
                        className="mt-1"
                      >
                        <ChevronDown className={cn(
                          "h-4 w-4 text-zinc-400 transition-transform",
                          expandedSummary === standard.standard ? "rotate-180" : ""
                        )} />
                      </button>
                    </div>
                  ))}
                  {/* Full-width description for summary */}
                  {expandedSummary && (
                    <div className="col-span-4 bg-zinc-800/95 p-4 rounded-md mt-2">
                      <div className="text-sm text-zinc-300">
                        {strongestStandards.find(s => s.standard === expandedSummary)?.description}
                      </div>
                    </div>
                  )}
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
                  {weakestStandards.map((standard) => (
                    <div key={standard.standard} className="flex flex-col items-center">
                      <div className="relative w-12 h-12 mb-1">
                        <CircleProgress percentage={standard.correct} />
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-100">
                          {standard.correct}%
                        </span>
                      </div>
                      <span className="text-xs text-zinc-300 text-center">{standard.standard}</span>
                      <button
                        onClick={() => setExpandedSummary(
                          expandedSummary === standard.standard ? null : standard.standard
                        )}
                        className="mt-1"
                      >
                        <ChevronDown className={cn(
                          "h-4 w-4 text-zinc-400 transition-transform",
                          expandedSummary === standard.standard ? "rotate-180" : ""
                        )} />
                      </button>
                    </div>
                  ))}
                  {/* Full-width description for summary */}
                  {expandedSummary && (
                    <div className="col-span-4 bg-zinc-800/95 p-4 rounded-md mt-2">
                      <div className="text-sm text-zinc-300">
                        {weakestStandards.find(s => s.standard === expandedSummary)?.description}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Standards Breakdown */}
            <div className="col-span-2 space-y-6">
              {Object.entries(standardsByCategory).map(([category, groups]) => (
                <Card key={category} className="bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="text-lg text-zinc-100">
                      {teksCategories[category]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Reporting Standards */}
                    {groups.reporting.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400 mb-3">Reporting Standards</h3>
                        <div className="grid grid-cols-6 gap-4 relative">
                          {groups.reporting.map((standard) => (
                            <div key={standard.standard} className="relative flex flex-col items-center">
                              <button 
                                onClick={() => setExpandedDetail(
                                  expandedDetail === standard.standard ? null : standard.standard
                                )}
                                className="group flex flex-col items-center hover:scale-105 transition-transform"
                              >
                                <div className="relative w-12 h-12">
                                  <CircleProgress percentage={standard.correct} />
                                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-100 group-hover:opacity-0 transition-opacity">
                                    {standard.correct}%
                                  </span>
                                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {standard.tested}/{standard.tested === 2 ? '2' : '1'}
                                  </span>
                                </div>
                                <span className="text-xs text-zinc-300 mt-1">
                                  {standard.standard}
                                </span>
                                <ChevronDown 
                                  className={cn(
                                    "w-4 h-4 mt-1 text-zinc-400 transition-transform",
                                    expandedDetail === standard.standard ? "rotate-180" : ""
                                  )}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                        {/* Move description outside of the grid */}
                        {expandedDetail && (
                          <div className="mt-4 bg-zinc-800 p-4 rounded-md">
                            <div className="text-sm text-zinc-300">
                              {groups.reporting.find(s => s.standard === expandedDetail)?.description}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Supporting Standards */}
                    {groups.supporting.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400 mb-3">Supporting Standards</h3>
                        <div className="grid grid-cols-6 gap-4">
                          {groups.supporting.map((standard) => (
                            <div 
                              key={standard.standard} 
                              className="flex flex-col items-center group"
                              title={standard.description} // Show description on hover
                            >
                              {/* Add fixed height container to prevent layout shifts */}
                              <div className="h-24 flex items-center justify-center"> {/* Height accommodates largest circle */}
                                <div 
                                  className={cn(
                                    "flex flex-col items-center transition-all",
                                    standard.isExpanded ? "pb-4" : ""
                                  )}
                                >
                                  <button 
                                    onClick={() => setExpandedDetail(
                                      expandedDetail === standard.standard ? null : standard.standard
                                    )}
                                    className="group flex flex-col items-center hover:scale-105 transition-transform"
                                  >
                                    <div className={cn(
                                      "relative",
                                      standard.tested === 2 ? "w-18 h-18" : "w-12 h-12"
                                    )}>
                                      <CircleProgress 
                                        percentage={standard.correct} 
                                        tested={standard.tested}
                                      />
                                      <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-100">
                                        {standard.correct}%
                                      </span>
                                      <span className="absolute inset-0 flex items-center justify-center text-sm font-medium bg-zinc-900/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        {Math.round((standard.correct/100) * standard.tested)}/{standard.tested}
                                      </span>
                                    </div>
                                  </button>
                                </div>
                              </div>
                              <span className="text-xs text-zinc-300 mt-1">
                                {standard.standard}
                              </span>
                              {/* Description dropdown */}
                              <div 
                                className={cn(
                                  "overflow-hidden transition-all duration-200 text-sm text-zinc-300 text-center px-2",
                                  standard.isExpanded ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"
                                )}
                              >
                                {standard.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
