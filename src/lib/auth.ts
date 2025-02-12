import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

interface ExtendedSession extends Session {
  accessToken?: string;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: [
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.students',
            'https://www.googleapis.com/auth/classroom.rosters.readonly',
            'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
            'openid',
            'email',
            'profile'
          ].join(' ')
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }: { session: ExtendedSession, token: JWT & { accessToken?: string } }): Promise<ExtendedSession> {
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      return session;
    }
  },
  debug: true
};
