import { ReactNode } from 'react';

export type ToastProps = {
  id: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: 'default' | 'destructive' | 'success';
};

export type ToastActionElement = {
  altText: string;
  children: ReactNode;
  className?: string;
  onClick: () => void;
};
