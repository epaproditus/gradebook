import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { JWT } from 'next-auth/jwt';

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.students https://www.googleapis.com/auth/classroom.rosters.readonly',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }: { session: any, token: JWT }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
