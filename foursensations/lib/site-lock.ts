/** Tienda pública cerrada. El admin y los webhooks de pago siguen activos. */
export const SITE_LOCKED = true;

export function isAllowedWhileLocked(pathname: string) {
  if (pathname === "/proximamente") return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname.startsWith("/api/admin")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (
    pathname.startsWith("/api/payments/") &&
    (pathname.endsWith("/confirmation") || pathname.endsWith("/webhook"))
  ) {
    return true;
  }
  return false;
}
