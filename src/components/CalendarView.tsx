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
  const [calendarView, setCalendarView] = useState<'month' | 'week' | '2week' | '3week' | 'day'>('month');
  const [hideWeekends, setHideWeekends] = useState(false);
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

  const handleViewChange = (view: 'month' | 'week' | '2week' | '3week' | 'day') => {
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
      <div className="w-full h-full overflow-y-auto">
        {dayAssignments.map(assignment => (
          <div
            key={assignment.id}
            className={cn(
              "text-xs p-1.5 rounded cursor-pointer hover:bg-secondary/80 w-full mb-1 last:mb-0",
              "flex flex-col justify-between h-[3.5rem]", // Fixed height for each assignment
              assignment.type === 'Assessment' 
                ? 'bg-red-50 border-l-2 border-red-500 text-red-900' 
                : 'bg-blue-50 border-l-2 border-blue-500 text-blue-900',
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleAssignment(assignment.id);
            }}
          >
            <div className="font-medium truncate">{assignment.name}</div>
            <div className="flex justify-between items-center text-[0.65rem]">
              <span className="text-muted-foreground">{assignment.subject}</span>
              <span className="bg-background px-1 rounded">
                {assignment.periods.length}p
              </span>
            </div>
          </div>
        ))}
      </div>
    ) : null;
  };

  // Month view
  const renderMonthView = () => {
    return (
      <div className="mt-4 w-full h-full">
        <Calendar
          mode="single"
          selected={selectedDate || undefined}
          onSelect={onDateSelect}
          month={currentDate}
          className="w-full h-full"
          classNames={{
            months: "w-full h-full",
            month: "w-full h-full",
            table: "w-full h-full border-collapse",
            head_cell: "w-[14%] h-10 text-center font-medium text-muted-foreground",
            cell: "w-[14%] h-32 relative border border-muted/50", // Increased height
            day: "h-full w-full flex flex-col gap-1 p-1",
            day_selected: "bg-primary/10 ring-1 ring-primary",
            day_today: "bg-accent/50 font-semibold",
            day_outside: "text-muted-foreground opacity-50",
            caption: "flex justify-center items-center py-2 relative",
            caption_label: "text-sm font-medium"
          }}
          modifiers={{
            hasAssignment: (date) => {
              return filteredAssignments.some(
                assignment => isSameDay(new Date(assignment.date), date)
              );
            },
            hasAssessment: (date) => {
              return filteredAssignments.some(
                assignment => 
                  assignment.type === 'Assessment' && 
                  isSameDay(new Date(assignment.date), date)
              );
            },
            hasDaily: (date) => {
              return filteredAssignments.some(
                assignment => 
                  assignment.type === 'Daily' && 
                  isSameDay(new Date(assignment.date), date)
              );
            }
          }}
          modifiersStyles={{
            hasAssignment: {
              borderBottom: '2px solid var(--primary)',
            },
            hasAssessment: {
              backgroundColor: 'var(--red-50)',
            },
            hasDaily: {
              backgroundColor: 'var(--blue-50)',
            }
          }}
          components={{
            Day: ({ date, modifiers, ...props }) => {
              const dayNumber = date.getDate();
              const isToday = isSameDay(date, new Date());
              
              return (
                <div className="w-full h-full flex flex-col">
                  <div className="flex justify-between items-start p-1">
                    <span className={cn(
                      "text-sm font-medium",
                      isToday && "font-bold",
                      modifiers?.hasAssignment && "text-primary"
                    )}>
                      {dayNumber}
                    </span>
                    {modifiers?.hasAssignment && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto w-full">
                    {renderAssignments(date)}
                  </div>
                </div>
              );
            }
          }}
        />
      </div>
    );
  };

  // Multi-week view generator
  const renderMultiWeekView = (weeks: number) => {
    const weekStarts = Array.from({ length: weeks }, (_, i) => 
      addDays(startOfWeek(currentDate), i * 7)
    );

    return (
      <div className="mt-4 space-y-4">
        {weekStarts.map((weekStart, weekIndex) => {
          const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
          const filteredDays = hideWeekends 
            ? days.filter(day => ![0, 6].includes(day.getDay()))
            : days;

          return (
            <div key={weekIndex} className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Week {weekIndex + 1}: {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </div>
              <div className="grid gap-2" style={{
                gridTemplateColumns: `repeat(${hideWeekends ? 5 : 7}, minmax(0, 1fr))`
              }}>
                {/* Day headers */}
                {days.map(day => {
                  if (hideWeekends && [0, 6].includes(day.getDay())) return null;
                  return (
                    <div 
                      key={day.toString()}
                      className={cn(
                        "font-medium text-center p-2 border-b",
                        [0, 6].includes(day.getDay()) && !hideWeekends && "text-muted-foreground"
                      )}
                    >
                      {format(day, 'EEE')}
                      <div className="text-lg">{format(day, 'd')}</div>
                    </div>
                  );
                })}
                
                {/* Calendar cells */}
                {days.map(day => {
                  if (hideWeekends && [0, 6].includes(day.getDay())) return null;
                  return (
                    <div 
                      key={day.toString() + '-cell'} 
                      className={cn(
                        "border rounded p-2 min-h-[120px] cursor-pointer",
                        isSameDay(day, selectedDate || new Date()) && "bg-primary/10",
                        [0, 6].includes(day.getDay()) && !hideWeekends && "bg-muted/50"
                      )}
                      onClick={() => onDateSelect(day)}
                    >
                      {renderAssignments(day)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Week view
  const renderWeekView = () => renderMultiWeekView(1);

  // 2 Week view
  const render2WeekView = () => renderMultiWeekView(2);

  // 3 Week view
  const render3WeekView = () => renderMultiWeekView(3);

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
          <div className="flex items-center gap-2">
            <Select
              value={calendarView}
              onValueChange={(value: 'month' | 'week' | '2week' | '3week' | 'day') => handleViewChange(value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="2week">2 Weeks</SelectItem>
                <SelectItem value="3week">3 Weeks</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
            {calendarView !== 'month' && calendarView !== 'day' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setHideWeekends(!hideWeekends)}
              >
                {hideWeekends ? 'Show Weekends' : 'Hide Weekends'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {calendarView === 'month' && renderMonthView()}
      {calendarView === 'week' && renderWeekView()}
      {calendarView === '2week' && render2WeekView()}
      {calendarView === '3week' && render3WeekView()}
      {calendarView === 'day' && renderDayView()}
    </div>
  );
};

export default CalendarView;
