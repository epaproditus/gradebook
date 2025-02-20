import { Message } from '@/types/gradebook';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MessagePanelProps {
  messages: Message[];
  onResolve: (messageId: string) => void;
}

export function MessagePanel({ messages, onResolve }: MessagePanelProps) {
  const unreadCount = messages.filter(m => m.status === 'unread').length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <MessageCircle className="h-4 w-4" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-medium">Messages</h4>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages</p>
          ) : (
            messages.map(message => (
              <div 
                key={message.id} 
                className={cn(
                  "p-2 rounded border",
                  message.status === 'unread' && "bg-blue-50 border-blue-200",
                  message.status === 'resolved' && "opacity-50"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="text-sm">{message.message}</div>
                  {message.status !== 'resolved' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onResolve(message.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {format(new Date(message.created_at), 'PPp')}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
