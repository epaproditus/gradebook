import { google } from 'googleapis';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testGradeSync() {
  try {
    // Create OAuth2 client
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/api/auth/callback/google'
    );

    // Set credentials (you'll need to get these manually first time)
    oauth2Client.setCredentials({
      access_token: process.env.GOOGLE_ACCESS_TOKEN, // Add this to .env.local
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN, // Add this to .env.local
    });

    // Setup Google Classroom client
    const classroom = google.classroom({ 
      version: 'v1',
      auth: oauth2Client
    });

    // Get course work for a specific course (using '708732866408' - ALG. I)
    const courseId = '708732866408';
    
    console.log('Fetching coursework...');
    const courseWork = await classroom.courses.courseWork.list({
      courseId: courseId
    });

    if (!courseWork.data.courseWork?.[0]) {
      console.error('No coursework found');
      return;
    }

    // Get first assignment and its submissions
    const assignment = courseWork.data.courseWork[0];
    console.log('Testing with assignment:', assignment.title);

    const submissions = await classroom.courses.courseWork.studentSubmissions.list({
      courseId: courseId,
      courseWorkId: assignment.id!
    });

    if (!submissions.data.studentSubmissions?.[0]) {
      console.error('No submissions found');
      return;
    }

    // Try updating the first submission with a test grade
    const submission = submissions.data.studentSubmissions[0];
    console.log('Attempting to update grade for submission:', {
      courseId,
      courseWorkId: assignment.id,
      submissionId: submission.id
    });

    const result = await classroom.courses.courseWork.studentSubmissions.patch({
      courseId: courseId,
      courseWorkId: assignment.id!,
      id: submission.id!,
      updateMask: 'assignedGrade', // Changed from 'draftGrade'
      requestBody: {
        assignedGrade: 95  // Changed from draftGrade
      }
    });

    console.log('Grade update result:', result.status === 200 ? 'Success!' : 'Failed');
    console.log('Updated submission:', result.data);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGradeSync();
