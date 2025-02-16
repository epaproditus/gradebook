import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 rounded-md p-4 shadow-lg transition-all",
        type === 'success' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
      )}
    >
      <div className="flex items-center gap-2">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="rounded-full p-1 hover:bg-black/10"
        >
          ×
        </button>
      </div>
    </div>
  );
}
