
export interface StudentSubmissionPatchRequest {
  courseId: string;
  courseWorkId: string;
  id: string;
  draftGrade?: number;
  assignedGrade?: number;
}

export interface StudentSubmissionResponse {
  courseId: string;
  courseWorkId: string;
  id: string;
  userId: string;
  creationTime: string;
  updateTime: string;
  state: 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT';
  draftGrade?: number;
  assignedGrade?: number;
  alternateLink: string;
}
