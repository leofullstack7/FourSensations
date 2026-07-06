import type { AdminAiCompleteResult } from "@/lib/api/admin-products";
import { postAdminProductsAiCompleteOne } from "@/lib/api/admin-products";
import type { AiCompleteFieldOptions } from "@/lib/product-ai-fields";

const DEFAULT_CONCURRENCY = 6;

export type AiCompleteProgressCallbacks = {
  onStart?: (id: string) => void;
  onDone?: (result: AdminAiCompleteResult) => void;
};

/** Completa productos en paralelo (varias peticiones IA simultáneas) con callbacks por ítem. */
export async function runAdminProductsAiCompleteParallel(
  ids: string[],
  callbacks: AiCompleteProgressCallbacks = {},
  concurrency = DEFAULT_CONCURRENCY,
  options?: AiCompleteFieldOptions,
): Promise<{ results: AdminAiCompleteResult[]; summary: { total: number; succeeded: number; failed: number } }> {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) {
    return { results: [], summary: { total: 0, succeeded: 0, failed: 0 } };
  }

  const results: AdminAiCompleteResult[] = new Array(unique.length);
  let cursor = 0;
  let succeeded = 0;
  let failed = 0;

  async function worker() {
    while (cursor < unique.length) {
      const index = cursor++;
      const id = unique[index]!;
      callbacks.onStart?.(id);
      try {
        const result = await postAdminProductsAiCompleteOne(id, options);
        results[index] = result;
        if (result.ok && result.filled.length > 0) succeeded += 1;
        else failed += 1;
        callbacks.onDone?.(result);
      } catch (e) {
        const result: AdminAiCompleteResult = {
          id,
          name: id,
          ok: false,
          filled: [],
          error: e instanceof Error ? e.message : "Error de red",
        };
        results[index] = result;
        failed += 1;
        callbacks.onDone?.(result);
      }
    }
  }

  const workers = Math.min(concurrency, unique.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));

  return {
    results: results.filter(Boolean),
    summary: { total: unique.length, succeeded, failed },
  };
}
