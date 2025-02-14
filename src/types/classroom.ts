export interface Course {
  id: string;
  name: string;
  section?: string;
  setup_completed?: boolean;
}

export interface GoogleClassroomStudent {
  userId: string;
  profile: {
    emailAddress: string;
    name: {
      givenName: string;
      familyName: string;
      fullName: string;
    }
  }
}

export interface MappingData {
  id: string;
  google_id: string;
  student_id: string;
  period: string;
  google_email?: string;
}

export interface CourseMappingData {
  id: string;
  google_course_id: string;
  period: string;
  setup_completed: boolean;
}
