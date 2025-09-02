interface GradebookConfig {
  showColors: boolean;
  colorMode: 'none' | 'subject' | 'type' | 'status';
  groupBy: 'none' | 'type';
  dateFilter: 'asc' | 'desc' | 'none';
  subjectFilter: 'all' | 'Math 8' | 'Algebra I' | '7th Grade Math';
  studentSortOrder: 'none' | 'highest' | 'lowest';
}

// New interface for app navigation state
interface AppNavigationState {
  currentView: 'gradebook' | 'roster' | 'seating' | 'tutoring';
  lastActivePeriod: string;
  viewMode: 'assignment' | 'roster';
  expandedAssignments: Record<string, boolean>;
  isCalendarVisible: boolean;
}

const STORAGE_KEY = 'gradebook-config';
const NAVIGATION_KEY = 'app-navigation-state';

export const defaultConfig: GradebookConfig = {
  showColors: false,
  colorMode: 'status',
  groupBy: 'none',
  dateFilter: 'none',
  subjectFilter: 'all',
  studentSortOrder: 'none'
};

export const defaultNavigationState: AppNavigationState = {
  currentView: 'gradebook',
  lastActivePeriod: '',
  viewMode: 'assignment',
  expandedAssignments: {},
  isCalendarVisible: true
};

export function saveConfig(config: GradebookConfig) {
  // Save to both session and local storage
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save gradebook config:', e);
  }
}

export function loadConfig(): GradebookConfig {
  try {
    // First try session storage
    const sessionConfig = sessionStorage.getItem(STORAGE_KEY);
    if (sessionConfig) {
      return JSON.parse(sessionConfig);
    }
    
    // Then try local storage
    const localConfig = localStorage.getItem(STORAGE_KEY);
    if (localConfig) {
      return JSON.parse(localConfig);
    }
  } catch (e) {
    console.warn('Failed to load gradebook config:', e);
  }
  
  return defaultConfig;
}

// New functions for app navigation state
export function saveNavigationState(state: Partial<AppNavigationState>) {
  try {
    const currentState = loadNavigationState();
    const updatedState = {
      ...currentState,
      ...state
    };
    localStorage.setItem(NAVIGATION_KEY, JSON.stringify(updatedState));
  } catch (e) {
    console.warn('Failed to save navigation state:', e);
  }
}

export function loadNavigationState(): AppNavigationState {
  try {
    const storedState = localStorage.getItem(NAVIGATION_KEY);
    if (storedState) {
      return JSON.parse(storedState);
    }
  } catch (e) {
    console.warn('Failed to load navigation state:', e);
  }
  
  return defaultNavigationState;
}
