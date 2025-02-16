import { FC } from 'react';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { cn } from "@/lib/utils";
import { Assignment } from '@/types/gradebook';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekViewProps {
  date: Date;
  onDateSelect: (date: Date) => void;
  assignments: Record<string, Assignment>;
  onWeekChange: (date: Date) => void; // Add this prop
}

const WeekView: FC<WeekViewProps> = ({ date, onDateSelect, assignments, onWeekChange }) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // 0 = Sunday
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getDayAssignments = (day: Date) => {
    return Object.values(assignments).filter(assignment => 
      isSameDay(new Date(assignment.date), day)
    );
  };

  const navigateToPreviousWeek = () => {
    const newDate = addDays(weekStart, -7);
    onWeekChange(newDate);
  };

  const navigateToNextWeek = () => {
    const newDate = addDays(weekStart, 7);
    onWeekChange(newDate);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={navigateToPreviousWeek} size="icon">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium">
          {format(weekStart, 'MMMM d')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
        </div>
        <Button variant="ghost" onClick={navigateToNextWeek} size="icon">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-secondary">
          {days.map((day) => (
            <div key={day.toISOString()} className="p-2 text-center border-r last:border-r-0">
              <div className="text-sm font-medium">{format(day, 'EEE')}</div>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 h-32">
          {days.map((day) => {
            const dayAssignments = getDayAssignments(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-r last:border-r-0 p-1 cursor-pointer hover:bg-secondary/50 transition-colors",
                  isSameDay(day, date) && "bg-primary/10"
                )}
                onClick={() => onDateSelect(day)}
              >
                <div className={cn(
                  "text-right text-sm mb-1 p-1 rounded-full w-6 h-6 flex items-center justify-center",
                  isSameDay(day, date) && "bg-primary text-primary-foreground"
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayAssignments.map((assignment, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "text-xs p-1 rounded truncate",
                        assignment.type === 'Assessment' ? 'bg-red-50' : 'bg-yellow-50',
                      )}
                      title={assignment.name}
                    >
                      {assignment.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
