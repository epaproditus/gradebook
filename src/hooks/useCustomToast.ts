import { useState, useCallback } from 'react';

export function useCustomToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); // Auto-dismiss after 3 seconds
  }, []);

  return { toast, showToast, clearToast: () => setToast(null) };
}
