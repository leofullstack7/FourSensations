import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SITE_LOCKED, isAllowedWhileLocked } from "@/lib/site-lock";

function adminJsonError(status: 401 | 403, message: string) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (SITE_LOCKED && !isAllowedWhileLocked(path)) {
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Pronto estaremos al aire" },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow",
          },
        }
      );
    }

    const url = req.nextUrl.clone();
    url.pathname = "/proximamente";
    url.search = "";
    const locked = NextResponse.rewrite(url);
    locked.headers.set("Cache-Control", "no-store");
    locked.headers.set("X-Robots-Tag", "noindex, nofollow");
    return locked;
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  const token = secret
    ? await getToken({
        req,
        secret,
        secureCookie: process.env.NODE_ENV === "production",
      })
    : null;

  const isAdmin =
    !!token &&
    typeof token === "object" &&
    "role" in token &&
    (token as { role?: string }).role === "ADMIN";

  if (path.startsWith("/api/admin")) {
    if (!token) return adminJsonError(401, "No autorizado");
    if (!isAdmin) return adminJsonError(403, "Prohibido");
    return NextResponse.next();
  }

  const isLoginPage = path === "/admin/login";
  const isAdminProtected =
    path === "/admin" || (path.startsWith("/admin/") && !isLoginPage);

  if (isAdminProtected) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    if (!isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "forbidden");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)",
  ],
};
