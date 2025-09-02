export type Subject = 'Math 8' | 'Algebra I' | '7th Grade Math';

export interface Assignment {
  id: string;
  name: string;
  date: Date;
  type: 'Daily' | 'Assessment';
  periods: string[];
  subject: Subject;
  google_classroom_id?: string;
  google_course_id?: string;
  six_weeks_period: '1SW' | '2SW' | '3SW' | '4SW' | '5SW' | '6SW' | null;
  status?: 'not_started' | 'not_graded' | 'in_progress' | 'completed';
}

export interface Student {
  id: number;
  name: string;
  class_period: string;
  birthday?: string;
  google_id?: string;  // Add this field
  google_email?: string;  // Add this optional field too
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

export interface Message {
  id: string;
  student_id: number;
  assignment_id?: string;
  type: 'grade_question' | 'general';
  message: string;
  status: 'unread' | 'read' | 'resolved';
  created_at: string;
  read_at?: string;
  resolved_at?: string;
}

export interface Flag {
  id: string;
  student_id: number;
  assignment_id: string;
  created_at: string;
  reviewed_at: string | null;
  type: string;
}

export type AssignmentStatus = 'in_progress' | 'completed' | 'not_graded';
