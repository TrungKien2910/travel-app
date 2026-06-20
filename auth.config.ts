import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-safe auth config: no providers, no bcrypt, no Prisma — so the middleware
 * bundle stays small. The full config (with the Credentials provider) lives in
 * lib/auth.ts and spreads this in for the Node runtime.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  providers: [],
}
