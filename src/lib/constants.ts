export const SUBJECT_COLORS = {
  'Math 8': 'bg-purple-100 hover:bg-purple-200',
  'Algebra I': 'bg-green-100 hover:bg-green-200'
} as const;

export const TYPE_COLORS = {
  'Daily': 'bg-yellow-50 hover:bg-yellow-100',
  'Assessment': 'bg-red-50 hover:bg-red-100'
} as const;

export const STATUS_COLORS = {
  'not_started': {
    bg: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
    text: 'text-gray-400',
    dot: 'bg-gray-400'
  },
  'in_progress': {
    bg: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
    text: 'text-yellow-600',
    dot: 'bg-yellow-400'
  },
  'completed': {
    bg: 'bg-green-50 hover:bg-green-100 border-green-200',
    text: 'text-green-600',
    dot: 'bg-green-400'
  }
} as const;
