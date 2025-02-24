import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClientComponentClient({
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
});

export const mainSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const benchmarkSupabase = createClient(
  process.env.NEXT_PUBLIC_BENCHMARK_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_BENCHMARK_SUPABASE_ANON_KEY!
);

export const supabaseAuthConfig = {
  providers: ['google'],
  callbacks: {
    async signIn({ user, account }) {
      return user?.email?.endsWith('@eeisd.org') ?? false;
    }
  }
};
