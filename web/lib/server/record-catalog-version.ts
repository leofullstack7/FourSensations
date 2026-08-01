import { auth } from "@/auth";
import {
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
 */
export async function recordCatalogVersionSafe(opts: {
  label: string;
  summary?: string;
  changes: CatalogChangeInput[];
  createdBy?: string | null;
}): Promise<void> {
  try {
    const createdBy = opts.createdBy ?? (await getCatalogVersionActor());
    await commitCatalogChanges({
      label: opts.label,
      summary: opts.summary,
      createdBy,
      changes: opts.changes,
    });
  } catch (e) {
    console.error("[catalog-versioning] No se pudo registrar versión:", e);
  }
}
