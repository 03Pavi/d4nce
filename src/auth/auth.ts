import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { supabase } from '@/lib/supabase';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const email = credentials.email as string;
        const password = credentials.password as string;

        if (!email || !password) return null;

        // 1. Try Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.user) {
          // Map Supabase user to NextAuth user
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || email.split('@')[0],
            role: data.user.user_metadata?.role || (email.includes('admin') ? 'admin' : 'student'),
          };
        }

        // 2. Fallback Mock Auth (for demo purposes if Supabase isn't configured)
        // Allow in production for demo
        console.warn('Supabase auth failed or not configured. Using mock auth.');
        if (email === 'admin@d4nce.com' && password === 'admin') {
          return { id: '1', email, name: 'Admin User', role: 'admin' };
        }
        if (email === 'student@d4nce.com' && password === 'student') {
          return { id: '2', email, name: 'Student User', role: 'student' };
        }

        return null;
      },
    }),
  ],
});
