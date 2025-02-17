
interface GradebookConfig {
  showColors: boolean;
  colorMode: 'none' | 'subject' | 'type' | 'status';
  groupBy: 'none' | 'type';
  dateFilter: 'asc' | 'desc' | 'none';
  subjectFilter: 'all' | 'Math 8' | 'Algebra I';
  studentSortOrder: 'none' | 'highest' | 'lowest';
}

const STORAGE_KEY = 'gradebook-config';

export const defaultConfig: GradebookConfig = {
  showColors: false,
  colorMode: 'status',
  groupBy: 'none',
  dateFilter: 'none',
  subjectFilter: 'all',
  studentSortOrder: 'none'
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
