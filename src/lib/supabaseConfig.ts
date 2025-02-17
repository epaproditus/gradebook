import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const supabase = createClientComponentClient({
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
});

export const supabaseAuthConfig = {
  providers: ['google'],
  callbacks: {
    async signIn({ user, account }) {
      return user?.email?.endsWith('@eeisd.org') ?? false;
    }
  }
};
