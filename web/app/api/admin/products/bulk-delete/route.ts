import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import {
  adminProductBulkDeleteSchema,
  formatZodError,
} from "@/lib/validation/admin-product";

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = adminProductBulkDeleteSchema.safeParse(json);
  if (!parsed.success) {
    const { message, issues } = formatZodError(parsed.error);
    return NextResponse.json({ error: message, details: issues }, { status: 400 });
  }

  const body = parsed.data;

  try {
    if (body.mode === "all") {
      const r = await prisma.product.deleteMany({});
      return NextResponse.json({ deleted: r.count });
    }

    const uniqueIds = Array.from(new Set(body.ids));
    const r = await prisma.product.deleteMany({
      where: { id: { in: uniqueIds } },
    });
    return NextResponse.json({ deleted: r.count });
  } catch (e) {
    console.error("[POST /api/admin/products/bulk-delete]", e);
    return NextResponse.json({ error: "Error al eliminar productos" }, { status: 500 });
  }
}
