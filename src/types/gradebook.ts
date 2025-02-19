export interface Assignment {
  date: Date;
  name: string;
  periods: string[];
  type: 'Daily' | 'Assessment';
  subject: 'Math 8' | 'Algebra I';
  google_classroom_id?: string;
  google_course_id?: string;
}

export interface Student {
  id: number;
  name: string;
  class_period: string;
  birthday?: string;
  google_id?: string;
  google_email?: string;
  subject: string; // Add this field
}

export interface AssignmentTag {
  id: string;
  assignment_id: string;
  student_id: number;
  period: string;
  tag_type: 'absent' | 'late' | 'incomplete' | 'retest';
  created_at: string;
}

export interface GradeData {
  [key: string]: {
    [key: string]: {
      [key: string]: string;
    };
  };
}
