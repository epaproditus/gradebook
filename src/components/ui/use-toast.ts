export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

type ToastFunction = (options: ToastOptions) => void;

let toastFunction: ToastFunction = () => {};

export const setToastFunction = (fn: ToastFunction) => {
  toastFunction = fn;
};

export const toast = (options: ToastOptions) => {
  toastFunction(options);
};
