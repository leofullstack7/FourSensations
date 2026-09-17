import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { upsertTintCatalogEntries } from "@/lib/server/tint-catalog-db";
import { normalizeTintCatalogName } from "@/lib/bulk-import/tint-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.object({
  newFamilies: z.array(z.string().min(1)).default([]),
  newTypes: z.array(z.string().min(1)).default([]),
});

/**
 * Crea entradas faltantes en TintFamily / TintType (upsert, name en MAYÚSCULAS).
 * La UI llama esto tras resolver valores nuevos del CSV antes del commit de importación.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ error: parsed.error.message }, { status: 400 });
  }

  const newFamilies = parsed.data.newFamilies.map((n) => normalizeTintCatalogName(n));
  const newTypes = parsed.data.newTypes.map((n) => normalizeTintCatalogName(n));

  if (newFamilies.length === 0 && newTypes.length === 0) {
    return noStoreJson({ error: "Indica al menos una familia o tipo a crear" }, { status: 400 });
  }

  const catalog = await upsertTintCatalogEntries(prisma, {
    newFamilies,
    newTypes,
  });

  return noStoreJson({
    ok: true,
    families: catalog.families,
    types: catalog.types,
  });
}
