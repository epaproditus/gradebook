export interface Student {
  id: number;
  name: string;
  period: string;
  google_email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentMapping {
  id: string;
  google_id: string;
  google_email: string;
  student_id: number;
  period: string;
  created_at: string;
  updated_at: string;
  classroom_user_id?: string;
  students?: Student;
}
