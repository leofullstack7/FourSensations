/**
 * Garantiza que existan en `process.env` las variables de `.env` y `.env.local`.
 * Next.js suele cargarlas solo, pero en algunos casos (cwd, orden, caché) falla;
 * repetimos el criterio del seed: primero `.env`, luego `.env.local` (sobrescribe).
 *
 * Importar este módulo una vez al inicio de cualquier entry que use `process.env` en servidor.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

const root = process.cwd();
const opts = { quiet: true } as const;
config({ path: resolve(root, ".env"), ...opts });
config({ path: resolve(root, ".env.local"), override: true, ...opts });
