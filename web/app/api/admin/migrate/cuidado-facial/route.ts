import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { runCuidadoFacialMigration } from "@/lib/server/cuidado-facial-rehome";

/** Vista previa (sin cambios en BD). */
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const result = await runCuidadoFacialMigration(prisma, { dryRun: true });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/admin/migrate/cuidado-facial]", e);
    return NextResponse.json({ error: "Error al generar vista previa" }, { status: 500 });
  }
}

/** Ejecuta migración: reubica productos «Cuidado facial» y elimina la categoría. No toca imágenes. */
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
    const result = await runCuidadoFacialMigration(prisma, { dryRun });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[POST /api/admin/migrate/cuidado-facial]", e);
    return NextResponse.json({ error: "Error al migrar productos Cuidado facial" }, { status: 500 });
  }
}
