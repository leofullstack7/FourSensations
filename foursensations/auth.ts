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
  /** Sin esto estable, el JWT puede invalidarse al reiniciar el servidor (sesión «desaparece» tras Google). */
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
      /**
       * Proveedor `google`: si este callback retorna `false`, Auth.js responde **AccessDenied** en
       * `/api/auth/callback/google`.
       *
       * Condiciones exactas que aquí pueden causar `return false`:
       * - **Única condición de negocio:** ya existe un `User` con el mismo correo (comparación
       *   case-insensitive) y `role === "ADMIN"`. Así la cuenta del panel no puede usarse como login
       *   OAuth de la tienda.
       *
       * Todo lo demás con Google retorna `true`: usuario nuevo (el adaptador Prisma crea fila con
       * `role` por defecto **CUSTOMER** en `schema.prisma`), o usuario existente **CUSTOMER**
       * (enlace permitido con `allowDangerousEmailAccountLinking`).
       *
       * AccessDenied por otras causas (p. ej. `redirect_uri` no coincide en consola Google, error
       * de intercambio de código, `AUTH_SECRET` distinto) **no** pasan por esta rama: fallan antes
       * o en otra capa de Auth.js.
       */
      if (account?.provider !== "google") {
        return true;
      }

      const email = user?.email?.trim() ?? null;
      if (!email) {
        return true;
      }

      const existing = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { role: true },
      });

      if (existing?.role === "ADMIN") {
        console.log("[auth] signIn google rechazado:", {
          reason: "email_already_registered_as_admin",
          email,
        });
        return false;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.sub = user.id;
      }
      // OAuth (Google): el objeto `user` del adaptador no suele traer `role`; leer siempre de DB en el primer JWT.
      if (account?.provider === "google" && user?.id) {
        const u = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, name: true },
        });
        if (u) {
          token.role = u.role;
          if (u.name) token.name = u.name;
        }
      } else if (user) {
        const r = (user as { role?: string }).role;
        if (r) token.role = r;
        if (user.name) token.name = user.name;
      }
      if (token.sub && (!token.role || !token.name)) {
        const u = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: { role: true, name: true },
        });
        if (u) {
          if (u.role) token.role = u.role;
          if (u.name) token.name = u.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        session.user.role = token.role as string;
        if (typeof token.name === "string" && token.name.trim()) {
          session.user.name = token.name;
        }
      }
      return session;
    },
  },
});
