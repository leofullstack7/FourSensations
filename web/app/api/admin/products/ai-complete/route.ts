import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaProductToAdmin } from "@/lib/mappers/admin-product";
import {
  mergeAiGeneratedFields,
  resolveAiTargetFields,
  type AiCompletableField,
  type AiCompleteFieldOptions,
} from "@/lib/product-ai-fields";
import { generateProductAiSuggestions } from "@/lib/server/product-ai-openai";
import { filterOutMenuTags } from "@/lib/product-tags";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { adminProductAiCompleteSchema } from "@/lib/validation/admin-product-ai";
import { formatZodError } from "@/lib/validation/admin-product";

export const maxDuration = 120;

type CategoryRow = Awaited<ReturnType<typeof prisma.category.findMany>>[number] & {
  subcategories: { name: string; menuTag: string | null }[];
};

let categoryCache: { expires: number; map: Map<string, CategoryRow> } | null = null;

async function getCategoryBySlugMap(): Promise<Map<string, CategoryRow>> {
  const now = Date.now();
  if (categoryCache && categoryCache.expires > now) return categoryCache.map;
  const categories = await prisma.category.findMany({ include: { subcategories: true } });
  const map = new Map(categories.map((c) => [c.slug, c as CategoryRow]));
  categoryCache = { expires: now + 60_000, map };
  return map;
}

type AiResultRow = {
  id: string;
  name: string;
  ok: boolean;
  filled: AiCompletableField[];
  error?: string;
  product?: ReturnType<typeof prismaProductToAdmin>;
};

async function completeOneProduct(
  id: string,
  row: Awaited<ReturnType<typeof prisma.product.findMany>>[number] | undefined,
  categoryBySlug: Map<string, CategoryRow>,
  options: AiCompleteFieldOptions = {},
): Promise<AiResultRow> {
  if (!row) {
    return { id, name: id, ok: false, filled: [], error: "Producto no encontrado" };
  }

  const admin = prismaProductToAdmin(row);
  const targetFields = resolveAiTargetFields(admin, options);
  if (targetFields.length === 0) {
    return { id, name: row.name, ok: true, filled: [], product: admin };
  }

  const cat = categoryBySlug.get(row.category);
  const sub = cat?.subcategories.find((s) => s.name === row.subcategory);
  const menuTagForSub = sub?.menuTag?.trim() || null;

  try {
    const suggestion = await generateProductAiSuggestions({
      name: row.name,
      brand: row.brand,
      categoryLabel: cat?.name ?? row.category,
      categorySlug: row.category,
      subcategory: row.subcategory,
      priceCop: row.price,
      emptyFields: targetFields,
      menuTagForSubcategory: menuTagForSub,
      existingDescription: row.description,
      rewriteDescriptions: options.rewriteDescriptions,
    });

    const filled: AiCompletableField[] = [];
    const updateData: Record<string, unknown> = {};

    if (targetFields.includes("description") && suggestion.description) {
      updateData.description = suggestion.description;
      filled.push("description");
    }
    if (targetFields.includes("tags") && suggestion.tags?.length) {
      const cleaned = filterOutMenuTags(suggestion.tags, menuTagForSub ? [menuTagForSub] : []);
      if (cleaned.length) {
        updateData.tags = cleaned;
        filled.push("tags");
      }
    }
    if (targetFields.includes("emoji") && suggestion.emoji) {
      updateData.emoji = suggestion.emoji;
      filled.push("emoji");
    }
    if (targetFields.includes("badge") && suggestion.badge !== undefined) {
      updateData.badge = suggestion.badge;
      filled.push("badge");
    }

    if (filled.length === 0) {
      return {
        id,
        name: row.name,
        ok: false,
        filled: [],
        error: "La IA no generó datos utilizables",
      };
    }

    const aiGeneratedFields = mergeAiGeneratedFields(row.aiGeneratedFields, filled);
    const updated = await prisma.product.update({
      where: { id },
      data: { ...updateData, aiGeneratedFields: aiGeneratedFields ?? undefined },
      include: { images: true },
    });

    return {
      id,
      name: row.name,
      ok: true,
      filled,
      product: prismaProductToAdmin(updated),
    };
  } catch (e) {
    return {
      id,
      name: row.name,
      ok: false,
      filled: [],
      error: e instanceof Error ? e.message : "Error de IA",
    };
  }
}

const ROUTE_CONCURRENCY = 4;

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
  const aiOptions: AiCompleteFieldOptions = {
    fields: parsed.data.fields,
    forceRegenerate: parsed.data.forceRegenerate,
    rewriteDescriptions: parsed.data.rewriteDescriptions,
  };

  try {
    const [rows, categoryBySlug] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: uniqueIds } },
        include: { images: true },
      }),
      getCategoryBySlugMap(),
    ]);

    const rowById = new Map(rows.map((r) => [r.id, r]));
    const results: AiResultRow[] = new Array(uniqueIds.length);
    let cursor = 0;

    async function worker() {
      while (cursor < uniqueIds.length) {
        const index = cursor++;
        const id = uniqueIds[index]!;
        results[index] = await completeOneProduct(id, rowById.get(id), categoryBySlug, aiOptions);
      }
    }

    const workers = Math.min(ROUTE_CONCURRENCY, uniqueIds.length);
    await Promise.all(Array.from({ length: workers }, () => worker()));

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
