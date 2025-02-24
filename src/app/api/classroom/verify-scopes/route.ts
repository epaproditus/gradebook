import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly'
];

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ hasRequiredScopes: false });
    }

    const accessToken = authHeader.split(' ')[1];
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const tokenInfo = await oauth2Client.getTokenInfo(accessToken);
    
    const hasAllScopes = REQUIRED_SCOPES.every(scope => 
      tokenInfo.scopes?.includes(scope)
    );

    return NextResponse.json({ hasRequiredScopes: hasAllScopes });
  } catch (error) {
    console.error('Error verifying scopes:', error);
    return NextResponse.json({ hasRequiredScopes: false });
  }
}
