import { cn } from "@/lib/utils";

interface GradeBarProps {
  initialGrade: number;
  extraPoints: number;
  className?: string;
}

export function GradeBar({ initialGrade, extraPoints, className }: GradeBarProps) {
  const totalGrade = Math.min(100, initialGrade + extraPoints);
  
  const getGradeColor = (value: number) => {
    if (value >= 90) return 'bg-emerald-500';
    if (value >= 70) return 'bg-yellow-500';
    if (value >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center w-full gap-2">
      <div className={cn("relative h-8 flex-1 bg-zinc-800 rounded-md overflow-hidden", className)}>
        <div
          className={cn(
            "absolute top-0 left-0 h-full transition-all duration-500",
            getGradeColor(totalGrade)
          )}
          style={{ width: `${totalGrade}%` }}
        />
        <div className="absolute inset-0 flex items-center gap-2 px-3">
          <span className="font-bold text-white z-10">
            {initialGrade}
          </span>
          {extraPoints > 0 && (
            <>
              <span className="text-zinc-400">+</span>
              <span className="text-green-400 font-bold">{extraPoints}</span>
              <span className="text-zinc-400">=</span>
              <span className="font-bold text-white">{totalGrade}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
