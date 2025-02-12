import NextAuth, { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

declare module "next-auth" {
  interface Session extends DefaultSession {
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
          access_type: "offline",
          response_type: "code",
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.students',
            'https://www.googleapis.com/auth/classroom.rosters.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.me',
            'https://www.googleapis.com/auth/classroom.profile.emails',
            'https://www.googleapis.com/auth/classroom.profile.photos',
            'https://www.googleapis.com/auth/classroom.guardianlinks.students',
            'https://www.googleapis.com/auth/classroom.announcements',
            'https://www.googleapis.com/auth/classroom.topics',
            'https://www.googleapis.com/auth/classroom.courseworkmaterials',
            'https://www.googleapis.com/auth/classroom.push-notifications',
            'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly'
          ].join(' ')
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }: { session: any, token: any }) {
      session.accessToken = token.accessToken as string;
      return session;
    }
  },
  debug: true,
});

export { handler as GET, handler as POST };
