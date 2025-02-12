import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
}

export default function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex justify-center items-center", className)}>
      <div className="animate-spin rounded-full border-2 border-gray-200 border-b-blue-500 h-4 w-4"></div>
    </div>
  );
}
