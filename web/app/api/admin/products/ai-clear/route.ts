import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AI_COMPLETABLE_FIELDS,
  clearAiFieldValue,
  parseAiGeneratedFields,
  type AiCompletableField,
} from "@/lib/product-ai-fields";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { adminProductAiClearSchema } from "@/lib/validation/admin-product-ai";
import { formatZodError } from "@/lib/validation/admin-product";

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = adminProductAiClearSchema.safeParse(json);
  if (!parsed.success) {
    const { message, issues } = formatZodError(parsed.error);
    return NextResponse.json({ error: message, details: issues }, { status: 400 });
  }

  const uniqueIds = Array.from(new Set(parsed.data.ids));
  const fieldsFilter = parsed.data.fields?.length ? parsed.data.fields : [...AI_COMPLETABLE_FIELDS];

  try {
    const rows = await prisma.product.findMany({ where: { id: { in: uniqueIds } } });
    let clearedProducts = 0;
    let clearedFields = 0;

    for (const row of rows) {
      const flags = parseAiGeneratedFields(row.aiGeneratedFields);
      const toClear = fieldsFilter.filter((f) => flags[f] === true);
      if (toClear.length === 0) continue;

      const updateData: Record<string, unknown> = {};
      for (const field of toClear) {
        Object.assign(updateData, clearAiFieldValue(field));
        clearedFields += 1;
      }

      const nextFlags = { ...flags };
      for (const field of toClear) delete nextFlags[field];

      await prisma.product.update({
        where: { id: row.id },
        data: {
          ...updateData,
          aiGeneratedFields:
            Object.keys(nextFlags).length > 0 ? (nextFlags as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
      clearedProducts += 1;
    }

    return NextResponse.json({ clearedProducts, clearedFields });
  } catch (e) {
    console.error("[POST /api/admin/products/ai-clear]", e);
    return NextResponse.json({ error: "Error al quitar datos de IA" }, { status: 500 });
  }
}
