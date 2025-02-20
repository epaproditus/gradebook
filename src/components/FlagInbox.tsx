import { InboxIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Flag {
  id: string;
  student_id: number;
  assignment_id: string;
  created_at: string;
  reviewed_at: string | null;
}

interface FlagInboxProps {
  flags: Flag[];
  students: Record<string, any[]>;
  assignments: Record<string, any>;
  onResolve: (flagId: string) => Promise<void>;
}

export function FlagInbox({ flags, students, assignments, onResolve }: FlagInboxProps) {
  const unreviewed = flags.filter(f => !f.reviewed_at);
  const getStudentName = (studentId: number) => {
    return Object.values(students)
      .flat()
      .find(s => s.id === studentId)?.name || 'Unknown Student';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <InboxIcon className="h-4 w-4" />
          {unreviewed.length > 0 && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreviewed.length}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-2">
          <h3 className="font-medium">Assignment Review Requests</h3>
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending reviews</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {flags.map(flag => (
                <div 
                  key={flag.id}
                  className={cn(
                    "p-2 rounded border text-sm",
                    flag.reviewed_at 
                      ? "bg-muted hover:bg-muted/80" 
                      : "bg-orange-50 border-orange-200 hover:bg-orange-100"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium">{getStudentName(flag.student_id)}</p>
                      <p className="text-muted-foreground">{assignments[flag.assignment_id]?.name}</p>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>{format(new Date(flag.created_at), 'MMM d, h:mm a')}</span>
                        {flag.reviewed_at && (
                          <span className="text-green-600">
                            ✓ Reviewed {format(new Date(flag.reviewed_at), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                    {!flag.reviewed_at && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onResolve(flag.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
