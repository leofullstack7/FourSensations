/** Solo la raíz (/) muestra el aviso. El resto de rutas sigue disponible. */
export const SITE_LOCKED = true;

export function isLockedEntry(pathname: string) {
  return SITE_LOCKED && pathname === "/";
}
