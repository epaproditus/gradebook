import { cn } from "@/lib/utils"

export function MessageIndicator({ count = 0 }) {
  if (count === 0) return null;
  
  return (
    <div className={cn(
      "absolute -top-1 -right-1",
      "h-4 w-4 rounded-full",
      "bg-red-500 text-white",
      "flex items-center justify-center",
      "text-xs font-bold"
    )}>
      {count > 9 ? '9+' : count}
    </div>
  );
}
