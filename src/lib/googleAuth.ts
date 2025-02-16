import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

export async function getGoogleAuthHeader() {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    throw new Error('No access token available');
  }

  return `Bearer ${session.accessToken}`;
}
