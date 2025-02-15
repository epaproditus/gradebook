import { OAuth2Client } from 'google-auth-library';

// Initialize the OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL
);

/**
 * Get authenticated Google API client using an access token
 */
export async function getGoogleClient(accessToken: string) {
  oauth2Client.setCredentials({
    access_token: accessToken
  });
  return oauth2Client;
}

/**
 * Refresh access token if needed
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}
