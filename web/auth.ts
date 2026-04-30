import "@/lib/load-env";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const googleConfigured =
  !!process.env.GOOGLE_CLIENT_ID?.trim() && !!process.env.GOOGLE_CLIENT_SECRET?.trim();

/**
 * Auth.js (NextAuth v5).
 * - Admin: proveedor `credentials` (email + password bcrypt, rol ADMIN).
 * - Tienda (clientes): Google OAuth + proveedor `customer-credentials` (rol CUSTOMER).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: "/",
  },
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      id: "customer-credentials",
      name: "CustomerCredentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = ((credentials?.email as string) ?? "").trim();
        const password = ((credentials?.password as string) ?? "") || "";
        if (!email || !password) return null;

        try {
          const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
          });
          if (!user?.passwordHash || user.role !== "CUSTOMER") return null;
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
    async signIn({ user, account }) {
      const email = user?.email?.trim();
      if (account?.provider === "google") {
        if (!email) return false;
        const existing = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        if (existing?.role === "ADMIN") return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as { role?: string }).role;
      }
      if (token.sub) {
        const r = token.role as string | undefined;
        if (!r) {
          const u = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: { role: true },
          });
          if (u) token.role = u.role;
        }
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
