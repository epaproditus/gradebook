
import { google } from 'googleapis';
import { StudentSubmissionPatchRequest, StudentSubmissionResponse } from './types';

export async function syncGradeToClassroom(
  auth: any,
  request: StudentSubmissionPatchRequest
): Promise<StudentSubmissionResponse> {
  const classroom = google.classroom({ version: 'v1', auth });

  try {
    const response = await classroom.courses.courseWork.studentSubmissions.patch({
      courseId: request.courseId,
      courseWorkId: request.courseWorkId,
      id: request.id,
      updateMask: request.assignedGrade ? 'assignedGrade' : 'draftGrade',
      requestBody: {
        assignedGrade: request.assignedGrade,
        draftGrade: request.draftGrade,
      },
    });

    if (!response.data) {
      throw new Error('No data received from Google Classroom API');
    }

    return response.data as StudentSubmissionResponse;
  } catch (error: any) {
    throw new Error(`Failed to sync grade: ${error.message}`);
  }
}
