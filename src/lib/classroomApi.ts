import { google } from 'googleapis';

export async function updateStudentGrade({
  classroom,
  courseId,
  courseWorkId,
  studentId,
  grade
}: {
  classroom: any;
  courseId: string;
  courseWorkId: string;
  studentId: string;
  grade: number;
}) {
  // 1. Get student's submission
  const { data } = await classroom.courses.courseWork.studentSubmissions.list({
    courseId,
    courseWorkId,
    userId: studentId,
  });

  const submission = data.studentSubmissions?.[0];
  if (!submission?.id) {
    throw new Error(`No submission found for student ${studentId}`);
  }

  // 2. Update the grade using PATCH
  return classroom.courses.courseWork.studentSubmissions.patch({
    courseId,
    courseWorkId,
    id: submission.id,
    updateMask: 'assignedGrade,draftGrade',
    requestBody: {
      assignedGrade: grade,
      draftGrade: grade
    }
  });
}
