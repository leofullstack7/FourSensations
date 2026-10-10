import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      role?: string;
      isWholesale?: boolean;
    };
  }

  interface User {
    role?: string;
    isWholesale?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    isWholesale?: boolean;
  }
}
