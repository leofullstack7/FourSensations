import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { runProagingMigration } from "@/lib/server/proaging-rehome";

/** Vista previa (sin cambios en BD). */
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const result = await runProagingMigration(prisma, { dryRun: true });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/admin/migrate/proaging]", e);
    return NextResponse.json({ error: "Error al generar vista previa" }, { status: 500 });
  }
}

/** Ejecuta migración: reubica productos Proaging y elimina la categoría. No toca imágenes. */
export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  let dryRun = false;
  try {
    const j = (await req.json()) as { dryRun?: boolean };
    dryRun = j?.dryRun === true;
  } catch {
    /* cuerpo vacío: ejecutar de verdad */
  }
  try {
    const result = await runProagingMigration(prisma, { dryRun });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[POST /api/admin/migrate/proaging]", e);
    return NextResponse.json({ error: "Error al migrar productos Proaging" }, { status: 500 });
  }
}
