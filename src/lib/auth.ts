import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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

export async function getUserRole() {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.email) return null;

  // Check if user is a teacher (you can store this in a separate table)
  const { data: teacher } = await supabase
    .from('teachers')
    .select('*')
    .eq('email', session.user.email)
    .single();

  if (teacher) return 'teacher';

  // Check if user is a student
  const { data: student } = await supabase
    .from('student_mappings')
    .select('*')
    .eq('google_email', session.user.email)
    .single();

  if (student) return 'student';

  return null;
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
            'https://www.googleapis.com/auth/classroom.courses',
            'https://www.googleapis.com/auth/classroom.coursework.me',
            'https://www.googleapis.com/auth/classroom.coursework.students',
            'https://www.googleapis.com/auth/classroom.rosters',
            'https://www.googleapis.com/auth/classroom.profile.emails',
            'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
            'https://www.googleapis.com/auth/classroom.announcements',
            'https://www.googleapis.com/auth/classroom.guardianlinks.students'
          ].join(' ')
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }): Promise<ExtendedToken> {
      // Initial sign in
      if (account && user) {
        console.log('Auth tokens:', {
          access_token: account.access_token?.slice(0, 10) + '...',
          refresh_token: account.refresh_token?.slice(0, 10) + '...',
          expires_at: account.expires_at,
          token_type: account.token_type
        });
        return {
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + ((account.expires_in as number ?? 3600) * 1000),
          refreshToken: account.refresh_token,
          user,
        };
      }

      // Return previous token if the access token has not expired
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token expired, try to refresh it
      return refreshAccessToken(token as ExtendedToken);
    },
    async session({ session, token }: { session: ExtendedSession, token: ExtendedToken }): Promise<ExtendedSession> {
      if (token.error) {
        throw new Error("RefreshAccessTokenError");
      }
      
      session.accessToken = token.accessToken;
      session.error = token.error;

      // Add token debugging
      console.log('Session update:', {
        tokenExpires: token.accessTokenExpires,
        now: Date.now(),
        expired: token.accessTokenExpires ? Date.now() > token.accessTokenExpires : false
      });

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
  },
  events: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        console.log("Google Sign In:", { 
          userId: user.id,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token
        });

        // Log full token info on sign in
        console.log('Google Sign In Tokens:', {
          accessToken: account.access_token?.slice(0, 10) + '...',
          refreshToken: account.refresh_token?.slice(0, 10) + '...',
          expiresAt: account.expires_at,
          tokenType: account.token_type,
          scope: account.scope
        });
      }
    }
  }
};

// Add error handler
export const authErrorHandler = (error: Error) => {
  console.error('Auth Error:', error);
  return { error: 'AuthError', status: 500 };
};
