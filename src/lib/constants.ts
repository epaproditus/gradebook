export const SUBJECT_COLORS = {
  'Math 8': 'bg-purple-100 hover:bg-purple-200',
  'Algebra I': 'bg-green-100 hover:bg-green-200'
} as const;

export const TYPE_COLORS = {
  'Daily': 'bg-yellow-50 hover:bg-yellow-100',
  'Assessment': 'bg-red-50 hover:bg-red-100'
} as const;

export const STATUS_COLORS = {
  completed: {
    bg: "bg-green-100 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-300",
    dot: "bg-green-500"
  },
  in_progress: {
    bg: "bg-blue-100 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500"
  },
  not_graded: {
    bg: "bg-orange-100 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500"
  }
} as const;
