import "@/lib/load-env";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Auth.js (NextAuth v5).
 * Login admin: únicamente usuario `ADMIN` en PostgreSQL (email + passwordHash bcrypt), p. ej. sembrado con `db:seed`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        username: { label: "Username", type: "text" },
      },
      async authorize(credentials) {
        const loginId =
          (credentials?.username as string)?.trim() ||
          (credentials?.email as string)?.trim() ||
          "";
        const password = (credentials?.password as string) || "";

        const email = loginId;
        if (!email || !password) return null;

        try {
          // Email guardado en el seed puede diferir en mayúsculas; Postgres + Prisma mode insensitive
          const user = await prisma.user.findFirst({
            where: {
              email: { equals: email, mode: "insensitive" },
            },
          });
          if (!user?.passwordHash || user.role !== "ADMIN") return null;
          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) return null;
          return {
            id: user.id,
            email: user.email ?? undefined,
            name: user.name ?? undefined,
            role: user.role,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "CUSTOMER";
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.sub;
        (session.user as { id?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
