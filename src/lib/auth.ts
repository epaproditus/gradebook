import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

interface ExtendedToken extends JWT {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
}

interface ExtendedSession extends Session {
  accessToken?: string;
  error?: string;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: false, // Disable debug mode in Edge Runtime
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.students',
            'https://www.googleapis.com/auth/classroom.rosters',
            'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly'
          ].join(' ')
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account }): Promise<ExtendedToken> {
      // Initial sign in
      if (account) {
        const expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000;
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: expiresAt,
        };
      }

      // Check if token has expired
      const tokenExpires = (token as ExtendedToken).accessTokenExpires;
      if (tokenExpires && Date.now() < tokenExpires) {
        return token as ExtendedToken;
      }

      // Token has expired, try to refresh it
      return refreshAccessToken(token as ExtendedToken);
    },
    async session({ session, token }: { session: ExtendedSession, token: ExtendedToken }): Promise<ExtendedSession> {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    }
  },
  pages: {
    signIn: '/classroom' // Redirect back to classroom page after sign in
  },
  logger: {
    error(code, ...message) {
      console.error(code, ...message);
    },
    warn(code, ...message) {
      console.warn(code, ...message);
    },
    debug(code, ...message) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(code, ...message);
      }
    }
  }
};

// Add error handler
export const authErrorHandler = (error: Error) => {
  console.error('Auth Error:', error);
  return { error: 'AuthError', status: 500 };
};

async function refreshAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken!,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw new Error(refreshedTokens.error || 'Failed to refresh token');
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('RefreshAccessTokenError:', error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
