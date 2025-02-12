import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
  }
  
  interface JWT {
    accessToken?: string;
    idToken?: string;
  }
}
