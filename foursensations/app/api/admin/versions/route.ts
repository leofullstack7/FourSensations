import { NextRequest } from "next/server";
import { z } from "zod";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApiWithActor } from "@/lib/server/require-admin-api";
import {
  ensureCatalogVersionBaseline,
  getCatalogVersionDetail,
  listCatalogVersions,
  restoreCatalogVersion,
} from "@/lib/server/catalog-versioning";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { denied, actor } = await requireAdminApiWithActor();
  if (denied) return denied;

  try {
    await ensureCatalogVersionBaseline(actor);
    const numberParam = req.nextUrl.searchParams.get("number");
    if (numberParam) {
      const number = Number(numberParam);
      if (!Number.isInteger(number) || number < 1) {
        return noStoreJson({ error: "Número de versión inválido" }, { status: 400 });
      }
      const detail = await getCatalogVersionDetail(number);
      if (!detail) return noStoreJson({ error: "Versión no encontrada" }, { status: 404 });
      return noStoreJson({ version: detail });
    }

    const list = await listCatalogVersions();
    return noStoreJson(list);
  } catch (e) {
    console.error("[GET /api/admin/versions]", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("CatalogVersion") || msg.includes("does not exist")) {
      return noStoreJson(
        {
          error:
            "Las tablas de versiones no existen. En la carpeta web ejecuta: npm run db:push",
        },
        { status: 500 },
      );
    }
    return noStoreJson({ error: "Error al listar versiones" }, { status: 500 });
  }
}

const restoreSchema = z.object({
  number: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  const { denied } = await requireAdminApiWithActor();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = restoreSchema.safeParse(json);
  if (!parsed.success) {
    return noStoreJson({ error: "Debes indicar un número de versión válido" }, { status: 400 });
  }

  try {
    const result = await restoreCatalogVersion(parsed.data.number);
    const list = await listCatalogVersions();
    return noStoreJson({
      ok: true,
      ...result,
      currentVersionNumber: list.currentVersionNumber,
      headVersionNumber: list.headVersionNumber,
      versions: list.versions,
    });
  } catch (e) {
    console.error("[POST /api/admin/versions]", e);
    const msg = e instanceof Error ? e.message : "No se pudo restaurar la versión";
    return noStoreJson({ error: msg }, { status: 400 });
  }
}
