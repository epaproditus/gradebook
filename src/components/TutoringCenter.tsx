'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Target, 
  Book, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RefreshCw,
  Lightbulb,
  GraduationCap,
  BookOpen,
  BarChart3,
  AlertCircle,
  ThumbsUp,
  Zap,
  Brain
} from 'lucide-react';
import { getTeksDescription } from '@/lib/teksData';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchProblems } from '@/lib/problemService';

// Mock problem data - in production, these would come from our backend
const MOCK_PROBLEMS = {
  'A.2A': [
    {
      id: 'p1',
      teks_standard: 'A.2A',
      problem_text: 'Solve for x: 2x + 3 = 7',
      difficulty: 1,
      answers: {
        correct: '2',
        options: ['1', '2', '3', '4']
      },
      solution: 'Subtract 3 from both sides: 2x = 4\nDivide both sides by 2: x = 2',
      hints: [
        'First, isolate the variable term.',
        'Then, solve for the variable.'
      ]
    },
    {
      id: 'p2',
      teks_standard: 'A.2A',
      problem_text: 'Solve for y: 3y - 9 = 0',
      difficulty: 1,
      answers: {
        correct: '3',
        options: ['2', '3', '4', '5']
      },
      solution: 'Add 9 to both sides: 3y = 9\nDivide both sides by 3: y = 3',
      hints: [
        'First, isolate the variable term.',
        'Then, solve for the variable.'
      ]
    },
    {
      id: 'p3',
      teks_standard: 'A.2A',
      problem_text: 'If 2(x + 3) = 14, what is the value of x?',
      difficulty: 2,
      answers: {
        correct: '4',
        options: ['3', '4', '5', '7']
      },
      solution: 'Distribute: 2x + 6 = 14\nSubtract 6 from both sides: 2x = 8\nDivide both sides by 2: x = 4',
      hints: [
        'First, distribute the 2 across the parentheses.',
        'Then, isolate the variable term.',
        'Finally, solve for the variable.'
      ]
    }
  ],
  'A.3B': [
    {
      id: 'p4',
      teks_standard: 'A.3B',
      problem_text: 'Simplify the expression: 2(3x + 4) - 5',
      difficulty: 2,
      answers: {
        correct: '6x + 3',
        options: ['6x + 3', '6x - 1', '5x + 8', '6x + 8']
      },
      solution: 'Distribute the 2: 6x + 8 - 5\nCombine like terms: 6x + 3',
      hints: [
        'First, distribute the 2 across the parentheses.',
        'Then, combine like terms.'
      ]
    }
  ],
  '8.8A': [
    {
      id: 'p5',
      teks_standard: '8.8A',
      problem_text: 'Write the equation of a line that passes through the points (2, 3) and (4, 7).',
      difficulty: 3,
      answers: {
        correct: 'y = 2x - 1',
        options: ['y = 2x - 1', 'y = 2x + 1', 'y = 3x - 3', 'y = x + 1']
      },
      solution: 'Calculate the slope: m = (7 - 3) ÷ (4 - 2) = 4 ÷ 2 = 2\nUse point-slope form: y - 3 = 2(x - 2)\nSimplify: y - 3 = 2x - 4\nSolve for y: y = 2x - 1',
      hints: [
        'First, calculate the slope using the formula m = (y₂ - y₁) ÷ (x₂ - x₁).',
        'Use point-slope form with one of the points and the slope.',
        'Simplify to slope-intercept form (y = mx + b).'
      ]
    }
  ]
};

// Mock weakness data - in production, this would be calculated from benchmark results
const MOCK_WEAKNESSES = [
  { standard: 'A.2A', description: 'Solving linear equations', mastery: 45, priority: 'high' },
  { standard: '8.8A', description: 'Writing equations of lines', mastery: 35, priority: 'high' },
  { standard: 'A.3B', description: 'Simplifying expressions', mastery: 55, priority: 'medium' }
];

interface Problem {
  id: string;
  teks_standard: string;
  problem_text: string;
  difficulty: number;
  answers: {
    correct: string;
    options: string[];
  };
  solution: string;
  hints: string[];
}

interface MasteryData {
  standard: string;
  mastery: number;
  problemsAttempted: number;
  problemsCorrect: number;
  priority: 'high' | 'medium' | 'low';
}

export function TutoringCenter() {
  const [studentWeaknesses, setStudentWeaknesses] = useState<MasteryData[]>(MOCK_WEAKNESSES);
  const [currentTeks, setCurrentTeks] = useState<string | null>(null);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hintsShown, setHintsShown] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [problemsCompleted, setProblemsCompleted] = useState<Record<string, {total: number, correct: number}>>(
    JSON.parse(localStorage.getItem('tutoring_progress') || '{}')
  );
  const [teksCategory, setTeksCategory] = useState<'all' | 'algebra' | 'regular'>('all');
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const supabase = createClientComponentClient();
  
  // Save progress to local storage
  useEffect(() => {
    localStorage.setItem('tutoring_progress', JSON.stringify(problemsCompleted));
  }, [problemsCompleted]);
  
  // Load student data
  useEffect(() => {
    // In production, we would fetch actual student data and calculate weaknesses
    // For the prototype, we'll use the mock data
    const firstWeakness = MOCK_WEAKNESSES[0].standard;
    setCurrentTeks(firstWeakness);
    if (MOCK_PROBLEMS[firstWeakness]) {
      setCurrentProblem(MOCK_PROBLEMS[firstWeakness][0]);
    }
  }, []);

  // Function to get next problem for current TEKS
  const getNextProblem = async () => {
    setLoading(true);
    try {
      // Get new problems when we run out of cached ones
      if (currentTeks) {
        const problems = await fetchProblems(currentTeks, 1, 2);
        if (problems && problems.length > 0) {
          setCurrentProblem(problems[0]);
          // Update completed count
          setProblemsCompleted(prev => ({
            ...prev,
            [currentTeks]: {
              total: (prev[currentTeks]?.total || 0) + 1,
              correct: prev[currentTeks]?.correct || 0
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching problems:', error);
      // Fallback to mock problems if API fails
      if (currentTeks && MOCK_PROBLEMS[currentTeks]) {
        const problems = MOCK_PROBLEMS[currentTeks];
        const completed = (problemsCompleted[currentTeks]?.total || 0) % problems.length;
        const nextIndex = completed % problems.length;
        setCurrentProblem(problems[nextIndex]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeks = (teks: string) => {
    setCurrentTeks(teks);
    if (MOCK_PROBLEMS[teks]) {
      const completed = (problemsCompleted[teks]?.total || 0) % MOCK_PROBLEMS[teks].length;
      const index = completed % MOCK_PROBLEMS[teks].length;
      setCurrentProblem(MOCK_PROBLEMS[teks][index]);
      
      // Reset state for new problem
      setShowSolution(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setHintsShown(0);
      setFeedbackMessage(null);
    }
  };

  const handleSelectAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    if (currentProblem && currentTeks) {
      const correct = answer === currentProblem.answers.correct;
      setIsCorrect(correct);
      
      // Update streak and stats
      if (correct) {
        setSessionStreak(prev => prev + 1);
        
        // Show feedback based on streak
        if (sessionStreak >= 2) {
          setFeedbackMessage({ 
            message: `${sessionStreak + 1} correct in a row! You're on fire!`, 
            type: 'success' 
          });
        } else {
          setFeedbackMessage({ 
            message: 'Great job! That\'s correct!', 
            type: 'success' 
          });
        }
        
        // Update mastery data
        setProblemsCompleted(prev => {
          const currentTotal = prev[currentTeks]?.total || 0;
          const currentCorrect = prev[currentTeks]?.correct || 0;
          return {
            ...prev,
            [currentTeks]: {
              total: currentTotal,
              correct: currentCorrect + 1
            }
          }
        });

        // Also update the weakness data to reflect progress
        setStudentWeaknesses(prev => 
          prev.map(weakness => {
            if (weakness.standard === currentTeks) {
              // Recalculate mastery based on completed problems
              const totalProblems = (problemsCompleted[currentTeks]?.total || 0) + 1;
              const correctProblems = (problemsCompleted[currentTeks]?.correct || 0) + 1;
              const newMastery = Math.min(
                100, 
                Math.round((weakness.mastery + (correctProblems / totalProblems * 100)) / 2)
              );
              
              return {
                ...weakness,
                mastery: newMastery,
                problemsAttempted: (weakness.problemsAttempted || 0) + 1,
                problemsCorrect: (weakness.problemsCorrect || 0) + 1
              };
            }
            return weakness;
          })
        );
      } else {
        setSessionStreak(0);
        setFeedbackMessage({ 
          message: 'Not quite right. Try again or check the solution.', 
          type: 'error' 
        });
        
        // Update weakness data for incorrect answers too
        setStudentWeaknesses(prev => 
          prev.map(weakness => {
            if (weakness.standard === currentTeks) {
              return {
                ...weakness,
                problemsAttempted: (weakness.problemsAttempted || 0) + 1
              };
            }
            return weakness;
          })
        );
      }
    }
  };

  // Function to filter standards by TEKS type (algebra vs regular)
  const getFilteredWeaknesses = () => {
    return studentWeaknesses.filter(weakness => {
      if (teksCategory === 'all') return true;
      return teksCategory === 'algebra' ? 
        weakness.standard.startsWith('A.') : 
        !weakness.standard.startsWith('A.');
    });
  };

  const showNextHint = () => {
    if (currentProblem && hintsShown < currentProblem.hints.length) {
      setHintsShown(prev => prev + 1);
    }
  };

  // Calculate mastery progress for a standard
  const calculateMasteryProgress = (standard: string) => {
    const progress = problemsCompleted[standard];
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.correct / progress.total) * 100);
  };
  
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Tutoring Center</h1>
          <p className="text-muted-foreground">
            Practice problems tailored to your needs based on benchmark performance.
          </p>
        </div>
        
        {/* Add TEKS category filter */}
        <Select 
          value={teksCategory} 
          onValueChange={(value) => setTeksCategory(value as 'all' | 'algebra' | 'regular')}
          className="w-full sm:w-[180px] mt-2 sm:mt-0"
        >
          <SelectTrigger>
            <SelectValue placeholder="TEKS Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All TEKS</SelectItem>
            <SelectItem value="algebra">Algebra TEKS (A.)</SelectItem>
            <SelectItem value="regular">Regular TEKS (8.)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {feedbackMessage && (
        <Alert 
          className={cn(
            "mb-4 transition-all duration-300", 
            feedbackMessage.type === 'success' ? "bg-green-500/10 text-green-600 border-green-200" :
            feedbackMessage.type === 'error' ? "bg-red-500/10 text-red-600 border-red-200" :
            "bg-blue-500/10 text-blue-600 border-blue-200"
          )}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' && <ThumbsUp className="h-4 w-4" />}
            {feedbackMessage.type === 'error' && <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              {feedbackMessage.message}
            </AlertDescription>
          </div>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar with standards */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                <span>Areas for Growth</span>
              </CardTitle>
              <CardDescription>
                Focus on these standards to improve
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getFilteredWeaknesses().map(weakness => (
                  <div 
                    key={weakness.standard}
                    className={cn(
                      "p-3 border rounded-md cursor-pointer hover:bg-accent transition-colors",
                      currentTeks === weakness.standard && "border-primary bg-primary/10"
                    )}
                    onClick={() => handleSelectTeks(weakness.standard)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-medium">{weakness.standard}</div>
                      <Badge 
                        variant={
                          weakness.priority === 'high' ? 'destructive' : 
                          weakness.priority === 'medium' ? 'warning' : 
                          'outline'
                        }
                      >
                        {weakness.mastery}% Mastery
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {weakness.description}
                    </p>
                    {/* Progress indicator */}
                    <div className="mt-2">
                      <Progress 
                        value={weakness.mastery} 
                        className="h-1" 
                      />
                    </div>
                    
                    {/* Practice stats if available */}
                    {problemsCompleted[weakness.standard] && (
                      <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
                        <span>Practiced: {problemsCompleted[weakness.standard].total}</span>
                        <span>Correct: {problemsCompleted[weakness.standard].correct}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Empty state for filtered standards */}
                {getFilteredWeaknesses().length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No {teksCategory === 'algebra' ? 'Algebra' : 'Regular'} TEKS standards found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <BarChart3 className="h-4 w-4" />
                <span>Your Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(problemsCompleted).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(problemsCompleted).map(([teks, data]) => (
                    <div key={teks} className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">{teks}</span>
                        <span>{calculateMasteryProgress(teks)}% mastery</span>
                      </div>
                      <Progress value={calculateMasteryProgress(teks)} className="h-1" />
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{data.correct} correct</span>
                        <span>{data.total} attempts</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm text-center py-2">
                  Complete problems to track progress
                </div>
              )}
              
              {/* Session streak indicator */}
              {sessionStreak > 1 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium">Current streak: {sessionStreak}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* New recommendations card */}
          {showRecommendations && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <BookOpen className="h-4 w-4" />
                  <span>Learning Resources</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {currentTeks && (
                    <div className="space-y-3">
                      <p className="text-muted-foreground">
                        Resources for {currentTeks}:
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <Button variant="outline" className="justify-start" size="sm">
                          <BookOpen className="h-3 w-3 mr-2" />
                          Concept review
                        </Button>
                        <Button variant="outline" className="justify-start" size="sm">
                          <Brain className="h-3 w-3 mr-2" />
                          Video tutorial
                        </Button>
                        <Button variant="outline" className="justify-start" size="sm">
                          <GraduationCap className="h-3 w-3 mr-2" />
                          Practice examples
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Main content area */}
        <div className="lg:col-span-9">
          {currentTeks && currentProblem ? (
            <Card className="min-h-[500px] flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {currentTeks}
                    </Badge>
                    <CardTitle>Practice Problem</CardTitle>
                    <CardDescription>
                      {getTeksDescription(currentTeks)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground mr-1">Difficulty:</span>
                    {Array(currentProblem.difficulty).fill(0).map((_, i) => (
                      <span key={i} className="text-amber-500">★</span>
                    ))}
                    {Array(5 - currentProblem.difficulty).fill(0).map((_, i) => (
                      <span key={i} className="text-muted">★</span>
                    ))}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-grow flex flex-col">
                <div className="mb-6">
                  <div className="text-lg mb-8 p-4 bg-muted/30 rounded-md">
                    {currentProblem.problem_text}
                  </div>
                  
                  {!isCorrect && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      {currentProblem.answers.options.map(option => (
                        <Button
                          key={option}
                          variant={selectedAnswer === option ? "default" : "outline"}
                          className={cn(
                            "h-auto py-3 justify-start",
                            selectedAnswer === option && isCorrect === true && "bg-green-500 hover:bg-green-600",
                            selectedAnswer === option && isCorrect === false && "bg-red-500 hover:bg-red-600"
                          )}
                          onClick={() => handleSelectAnswer(option)}
                          disabled={loading || isCorrect !== null}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span>{option}</span>
                            {selectedAnswer === option && isCorrect === false && (
                              <XCircle className="h-5 w-5 text-white" />
                            )}
                            {selectedAnswer === option && isCorrect === true && (
                              <CheckCircle2 className="h-5 w-5 text-white" />
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* Hints section */}
                  {!isCorrect && hintsShown > 0 && (
                    <div className="mb-6 space-y-3">
                      <h3 className="font-medium flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <span>Hints</span>
                      </h3>
                      {currentProblem.hints.slice(0, hintsShown).map((hint, index) => (
                        <div key={index} className="p-3 bg-muted/30 rounded-md text-sm">
                          {hint}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Solution section */}
                  {(showSolution || isCorrect) && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-md space-y-2">
                      <h3 className="font-medium flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Solution</span>
                      </h3>
                      <div className="whitespace-pre-line text-sm">
                        {currentProblem.solution}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-auto flex flex-wrap justify-between items-center gap-2 pt-4 border-t">
                  {!isCorrect && hintsShown < (currentProblem.hints?.length || 0) && (
                    <Button 
                      variant="ghost" 
                      onClick={showNextHint}
                      className="text-amber-500 hover:text-amber-600"
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Need a hint?
                    </Button>
                  )}
                  
                  {selectedAnswer && isCorrect === false && !showSolution && (
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowSolution(true)}
                    >
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Show solution
                    </Button>
                  )}
                  
                  {!loading && (isCorrect || showSolution) && (
                    <Button onClick={getNextProblem}>
                      Next problem
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                  
                  {loading && (
                    <Button disabled>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading problem...
                    </Button>
                  )}
                </div>
              </CardContent>
              
              {/* Add stats related to current standard at the bottom */}
              <CardFooter className="border-t bg-muted/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full text-sm">
                  <div className="text-muted-foreground">
                    Attempted: {problemsCompleted[currentTeks]?.total || 0} problems
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          <span>Estimated Mastery:</span>
                          <Progress 
                            value={calculateMasteryProgress(currentTeks)} 
                            className="h-2 w-24" 
                          />
                          <span className="font-medium">
                            {calculateMasteryProgress(currentTeks)}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Based on {problemsCompleted[currentTeks]?.total || 0} practice problems</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardFooter>
            </Card>
          ) : (
            <Card className="min-h-[500px] flex items-center justify-center">
              <CardContent>
                <div className="text-center">
                  <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-medium">Select a standard to practice</h2>
                  <p className="text-muted-foreground mt-2">
                    Choose from your growth areas on the left to start practicing
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
