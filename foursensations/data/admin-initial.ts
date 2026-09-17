import type { MenuConfig } from "@/lib/types/admin";
import { defaultMenuConfig } from "@/lib/menu-config";

/** Fallback del menú admin: misma estructura que la tienda de lanzamiento. */
export function getDefaultAdminMenu(): MenuConfig {
  return structuredClone(defaultMenuConfig);
}
