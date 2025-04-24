import { FC, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from "@/lib/utils";
import { Assignment, Student } from '@/types/gradebook';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, isWithinInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarViewProps {
  assignments: Record<string, Assignment>;
  students: Record<string, Student[]>;
  selectedDate: Date | null;
  onDateSelect: (date: Date | undefined) => void;
  sixWeeksFilter: string;
  activeTab: string;
  toggleAssignment: (assignmentId: string) => void;
  onViewChange?: (view: 'month' | 'week' | 'day') => void;
}

const CalendarView: FC<CalendarViewProps> = ({
  assignments,
  students,
  selectedDate,
  onDateSelect,
  sixWeeksFilter,
  activeTab,
  toggleAssignment
}) => {
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate || new Date());

  // Filter assignments based on sixWeeksFilter and possibly activeTab
  const filteredAssignments = Object.entries(assignments)
    .filter(([_, assignment]) => {
      if (sixWeeksFilter && sixWeeksFilter !== 'all') {
        return assignment.six_weeks_period === sixWeeksFilter;
      }
      return true;
    })
    .map(([id, assignment]) => ({ id, ...assignment }));

  const handleViewChange = (view: 'month' | 'week' | 'day') => {
    setCalendarView(view);
    if (props.onViewChange) {
      props.onViewChange(view);
    }
  };

  const handlePrevious = () => {
    if (calendarView === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(prev => addDays(prev, -7));
    } else {
      setCurrentDate(prev => addDays(prev, -1));
    }
  };

  const handleNext = () => {
    if (calendarView === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(prev => addDays(prev, 7));
    } else {
      setCurrentDate(prev => addDays(prev, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Render assignment items for a specific date
  const renderAssignments = (date: Date) => {
    const dayAssignments = filteredAssignments.filter(assignment => 
      isSameDay(new Date(assignment.date), date)
    );

    return dayAssignments.length > 0 ? (
      <div className="space-y-1 mt-1">
        {dayAssignments.map(assignment => (
          <div
            key={assignment.id}
            className={cn(
              "text-xs p-1 rounded truncate cursor-pointer hover:bg-secondary",
              assignment.type === 'Assessment' ? 'bg-red-100' : 'bg-blue-100',
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleAssignment(assignment.id);
            }}
            title={assignment.name}
          >
            {assignment.name}
          </div>
        ))}
      </div>
    ) : null;
  };

  // Month view
  const renderMonthView = () => {
    return (
      <div className="mt-4">
        <Calendar
          mode="single"
          selected={selectedDate || undefined}
          onSelect={onDateSelect}
          month={currentDate}
          className="w-full"
          modifiers={{
            assignment: (date) => {
              return filteredAssignments.some(
                assignment => isSameDay(new Date(assignment.date), date)
              );
            }
          }}
          modifiersStyles={{
            assignment: {
              border: '2px solid var(--primary)',
              fontWeight: 'bold'
            }
          }}
          components={{
            Day: ({ date, ...props }) => (
              <div className="w-full">
                <div {...props} />
                {renderAssignments(date)}
              </div>
            )
          }}
        />
      </div>
    );
  };

  // Week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="mt-4">
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {weekDays.map(day => (
            <div 
              key={day.toString()}
              className="font-medium text-center p-2 border-b"
            >
              {format(day, 'EEE')}
              <div className="text-lg">{format(day, 'd')}</div>
            </div>
          ))}
          
          {/* Calendar cells */}
          {weekDays.map(day => (
            <div 
              key={day.toString() + '-cell'} 
              className={cn(
                "border rounded p-2 min-h-[120px] cursor-pointer",
                isSameDay(day, selectedDate || new Date()) ? "bg-primary/10" : ""
              )}
              onClick={() => onDateSelect(day)}
            >
              {renderAssignments(day)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Daily view
  const renderDayView = () => {
    return (
      <div className="mt-4">
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-4">{format(currentDate, 'PPPP')}</h2>
          
          <div className="space-y-2">
            {filteredAssignments.filter(assignment => 
              isSameDay(new Date(assignment.date), currentDate)
            ).map(assignment => (
              <Card 
                key={assignment.id}
                className={cn(
                  "cursor-pointer hover:bg-secondary/20",
                  assignment.type === 'Assessment' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-blue-500'
                )}
                onClick={() => toggleAssignment(assignment.id)}
              >
                <CardHeader className="p-3">
                  <div className="flex justify-between">
                    <CardTitle className="text-base">{assignment.name}</CardTitle>
                    <span className="text-sm text-muted-foreground">{assignment.type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Subject: {assignment.subject} | 
                    Periods: {assignment.periods.join(', ')}
                  </div>
                </CardHeader>
              </Card>
            ))}
            
            {filteredAssignments.filter(assignment => 
              isSameDay(new Date(assignment.date), currentDate)
            ).length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No assignments for this date
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>Today</Button>
          <h2 className="text-xl font-semibold ml-2">
            {calendarView === 'month' && format(currentDate, 'MMMM yyyy')}
            {calendarView === 'week' && `Week of ${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`}
            {calendarView === 'day' && format(currentDate, 'PPPP')}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            value={calendarView}
            onValueChange={(value: 'month' | 'week' | 'day') => handleViewChange(value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {calendarView === 'month' && renderMonthView()}
      {calendarView === 'week' && renderWeekView()}
      {calendarView === 'day' && renderDayView()}
    </div>
  );
};

export default CalendarView;
