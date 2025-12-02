import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login", // Custom login page
  },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');
      const isOnStudent = nextUrl.pathname.startsWith('/student');
      const isOnLogin = nextUrl.pathname === '/login';

      if (isOnAdmin || isOnStudent) {
        if (isLoggedIn) {
          const role = (auth.user as any).role;
          if (isOnAdmin && role !== 'admin') {
            return Response.redirect(new URL('/student', nextUrl));
          }
          if (isOnStudent && role !== 'student') {
            return Response.redirect(new URL('/admin', nextUrl));
          }
          return true;
        }
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn && (isOnLogin || nextUrl.pathname === '/')) {
        // Redirect authenticated users to their respective dashboard
        const role = (auth.user as any).role;
        if (role === 'admin') {
          return Response.redirect(new URL('/admin', nextUrl));
        } else {
          return Response.redirect(new URL('/student', nextUrl));
        }
      }
      return true;
    },
  },
  providers: [], // Configured in auth.ts
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 day
  },
} satisfies NextAuthConfig;
