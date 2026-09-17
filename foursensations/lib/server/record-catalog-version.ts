import { auth } from "@/auth";
import {
  buildCatalogVersionSummary,
  commitCatalogChanges,
  type CatalogChangeInput,
} from "@/lib/server/catalog-versioning";

/** Obtiene el actor admin actual (email) sin fallar la mutación. */
export async function getCatalogVersionActor(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.email ?? session?.user?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Persiste una versión con los cambios dados.
 * No relanza: una falla de versionamiento no debe tumbar la mutación del admin.
 * @returns número de versión creada, o null si no hubo cambios / falló.
 */
export async function recordCatalogVersionSafe(opts: {
  label: string;
  summary?: string;
  changes: CatalogChangeInput[];
  createdBy?: string | null;
}): Promise<number | null> {
  try {
    const createdBy = opts.createdBy ?? (await getCatalogVersionActor());
    const summary =
      opts.summary?.trim() ||
      buildCatalogVersionSummary(opts.changes);
    const version = await commitCatalogChanges({
      label: opts.label,
      summary,
      createdBy,
      changes: opts.changes,
    });
    if (version) {
      console.info(
        `[catalog-versioning] Registrada v${version.number}: ${opts.label} (${opts.changes.length} cambio(s))`,
      );
      return version.number;
    }
    return null;
  } catch (e) {
    console.error("[catalog-versioning] No se pudo registrar versión:", e);
    return null;
  }
}
