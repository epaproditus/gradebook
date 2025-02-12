export interface Course {
  id: string;
  name: string;
  section?: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  title: string;
  due_date?: string;
  synced_id?: string;
  created_at: string;
}

export interface Grade {
  id: string;
  assignment_id: string;
  student_email: string;
  score: number;
  synced: boolean;
  updated_at: string;
}

export interface Student {
  email: string;
  first_name: string;
  last_name: string;
  student_id: string;
  created_at: string;
}
