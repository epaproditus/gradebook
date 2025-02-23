export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      seating_layouts: {
        Row: {
          id: string
          period: string
          layout: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          period: string
          layout: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          period?: string
          layout?: string
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          name: string
          period: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          name: string
          period: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          period?: string
          created_at?: string
          updated_at?: string
        }
      }
      grades: {
        Row: {
          id: string
          student_id: string
          grade: string
          assignment_id: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          student_id: string
          grade: string
          assignment_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          grade?: string
          assignment_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          name: string
          type: 'Daily' | 'Assessment'
          period: string
          due_date: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          name: string
          type: 'Daily' | 'Assessment'
          period: string
          due_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'Daily' | 'Assessment'
          period?: string
          due_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      assignment_tags: {
        Row: {
          id: string
          student_id: string
          assignment_id: string
          tag: 'absent' | 'late' | 'incomplete' | 'retest'
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          student_id: string
          assignment_id: string
          tag: 'absent' | 'late' | 'incomplete' | 'retest'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          assignment_id?: string
          tag?: 'absent' | 'late' | 'incomplete' | 'retest'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
