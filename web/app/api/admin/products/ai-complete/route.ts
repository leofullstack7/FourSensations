import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaProductToAdmin } from "@/lib/mappers/admin-product";
import {
  clearAiFieldValue,
  getEmptyAiFields,
  mergeAiGeneratedFields,
  parseAiGeneratedFields,
  type AiCompletableField,
} from "@/lib/product-ai-fields";
import { generateProductAiSuggestions } from "@/lib/server/product-ai-openai";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { adminProductAiCompleteSchema } from "@/lib/validation/admin-product-ai";
import { formatZodError } from "@/lib/validation/admin-product";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = adminProductAiCompleteSchema.safeParse(json);
  if (!parsed.success) {
    const { message, issues } = formatZodError(parsed.error);
    return NextResponse.json({ error: message, details: issues }, { status: 400 });
  }

  const uniqueIds = Array.from(new Set(parsed.data.ids));

  try {
    const rows = await prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      include: { images: true },
    });

    const categories = await prisma.category.findMany({
      include: { subcategories: true },
    });
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

    const results: {
      id: string;
      name: string;
      ok: boolean;
      filled: AiCompletableField[];
      error?: string;
      product?: ReturnType<typeof prismaProductToAdmin>;
    }[] = [];

    for (const id of uniqueIds) {
      const row = rows.find((r) => r.id === id);
      if (!row) {
        results.push({ id, name: id, ok: false, filled: [], error: "Producto no encontrado" });
        continue;
      }

      const admin = prismaProductToAdmin(row);
      const emptyFields = getEmptyAiFields(admin);
      if (emptyFields.length === 0) {
        results.push({ id, name: row.name, ok: true, filled: [], product: admin });
        continue;
      }

      const cat = categoryBySlug.get(row.category);
      const sub = cat?.subcategories.find((s) => s.name === row.subcategory);
      const menuTagHints = sub?.menuTag ? [sub.menuTag] : [];

      try {
        const suggestion = await generateProductAiSuggestions({
          name: row.name,
          brand: row.brand,
          categoryLabel: cat?.name ?? row.category,
          categorySlug: row.category,
          subcategory: row.subcategory,
          priceCop: row.price,
          emptyFields,
          menuTagHints,
        });

        const filled: AiCompletableField[] = [];
        const updateData: Record<string, unknown> = {};

        if (emptyFields.includes("description") && suggestion.description) {
          updateData.description = suggestion.description;
          filled.push("description");
        }
        if (emptyFields.includes("tags") && suggestion.tags?.length) {
          updateData.tags = suggestion.tags;
          filled.push("tags");
        }
        if (emptyFields.includes("emoji") && suggestion.emoji) {
          updateData.emoji = suggestion.emoji;
          filled.push("emoji");
        }
        if (emptyFields.includes("badge") && suggestion.badge !== undefined) {
          updateData.badge = suggestion.badge;
          filled.push("badge");
        }

        if (filled.length === 0) {
          results.push({
            id,
            name: row.name,
            ok: false,
            filled: [],
            error: "La IA no generó datos utilizables",
          });
          continue;
        }

        const aiGeneratedFields = mergeAiGeneratedFields(row.aiGeneratedFields, filled);
        const updated = await prisma.product.update({
          where: { id },
          data: { ...updateData, aiGeneratedFields: aiGeneratedFields ?? undefined },
          include: { images: true },
        });

        results.push({
          id,
          name: row.name,
          ok: true,
          filled,
          product: prismaProductToAdmin(updated),
        });
      } catch (e) {
        results.push({
          id,
          name: row.name,
          ok: false,
          filled: [],
          error: e instanceof Error ? e.message : "Error de IA",
        });
      }
    }

    const succeeded = results.filter((r) => r.ok && r.filled.length > 0).length;
    return NextResponse.json({
      results,
      summary: { total: results.length, succeeded, failed: results.length - succeeded },
    });
  } catch (e) {
    console.error("[POST /api/admin/products/ai-complete]", e);
    const msg = e instanceof Error ? e.message : "Error al completar con IA";
    const status = msg.includes("OPENAI_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
