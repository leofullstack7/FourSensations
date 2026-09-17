/**
 * Borra `web/.next` de forma tolerante a Windows (EBUSY/EPERM, OneDrive, nombres con []).
 */
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const nextDir = join(here, "..", ".next");

try {
  rmSync(nextDir, {
    recursive: true,
    force: true,
    maxRetries: 15,
    retryDelay: 250,
  });
  console.log("[clean-next] Eliminado .next");
} catch (e) {
  console.warn("[clean-next] No se pudo borrar .next por completo:", e?.message ?? e);
  process.exitCode = 0;
}
