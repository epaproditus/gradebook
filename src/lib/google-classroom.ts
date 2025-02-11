import { google } from 'googleapis';

// Configure OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Create Classroom API client
const classroom = google.classroom({ version: 'v1', auth: oauth2Client });

export async function listCourseWork(courseId: string) {
  try {
    const response = await classroom.courses.courseWork.list({
      courseId: courseId
    });
    return response.data.courseWork || [];
  } catch (error) {
    console.error('Error fetching course work:', error);
    throw error;
  }
}

export async function getStudentSubmissions(courseId: string, courseWorkId: string) {
  try {
    const response = await classroom.courses.courseWork.studentSubmissions.list({
      courseId: courseId,
      courseWorkId: courseWorkId
    });
    return response.data.studentSubmissions || [];
  } catch (error) {
    console.error('Error fetching student submissions:', error);
    throw error;
  }
}

export async function updateGrade(
  courseId: string,
  courseWorkId: string,
  submissionId: string,
  grade: number
) {
  try {
    await classroom.courses.courseWork.studentSubmissions.patch({
      courseId: courseId,
      courseWorkId: courseWorkId,
      id: submissionId,
      updateMask: 'assignedGrade',
      requestBody: {
        assignedGrade: grade
      }
    });
  } catch (error) {
    console.error('Error updating grade:', error);
    throw error;
  }
}
