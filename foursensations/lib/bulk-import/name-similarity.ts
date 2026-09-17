import { codeSimilarityRatio } from "@/lib/bulk-import/code-similarity";

/** Umbral muy alto: solo nombres casi iguales (errores tipográficos / variantes menores). */
export const BULK_NAME_COMBINE_SIMILARITY_MIN = 0.9;

export function normalizeProductNameForSimilarity(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  let s = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^a-z0-9áéíóúñü\s]+/gi, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export type NameCombineCandidate = {
  id: string;
  name: string;
};

export type NameCombineSuggestionGroup = {
  id: string;
  score: number;
  members: NameCombineCandidate[];
};

/**
 * Agrupa productos cuyo nombre es muy similar (unión transitiva).
 * score = mínima similitud entre pares del grupo (peor enlace).
 */
export function suggestNameCombineGroups(
  items: NameCombineCandidate[],
  minRatio = BULK_NAME_COMBINE_SIMILARITY_MIN
): NameCombineSuggestionGroup[] {
  const usable = items
    .map((it) => ({
      ...it,
      norm: normalizeProductNameForSimilarity(it.name),
    }))
    .filter((it) => it.norm.length >= 4);

  const n = usable.length;
  if (n < 2) return [];

  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    if (parent[i] !== i) parent[i] = find(parent[i]!);
    return parent[i]!;
  };
  const unite = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const pairScore = new Map<string, number>();
  const edgeKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = usable[i]!;
      const b = usable[j]!;
      let score = codeSimilarityRatio(a.norm, b.norm);
      // Contención casi total (mismo producto con sufijo corto).
      if (a.norm.includes(b.norm) || b.norm.includes(a.norm)) {
        const shorter = Math.min(a.norm.length, b.norm.length);
        const longer = Math.max(a.norm.length, b.norm.length);
        if (shorter / longer >= 0.85) score = Math.max(score, 0.92);
      }
      if (score >= minRatio) {
        unite(i, j);
        pairScore.set(edgeKey(i, j), score);
      }
    }
  }

  const buckets = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = buckets.get(root) ?? [];
    list.push(i);
    buckets.set(root, list);
  }

  const groups: NameCombineSuggestionGroup[] = [];
  for (const idxs of buckets.values()) {
    if (idxs.length < 2) continue;
    let minEdge = 1;
    for (let a = 0; a < idxs.length; a++) {
      for (let b = a + 1; b < idxs.length; b++) {
        const s = pairScore.get(edgeKey(idxs[a]!, idxs[b]!));
        if (s != null) minEdge = Math.min(minEdge, s);
      }
    }
    const members = idxs.map((i) => ({
      id: usable[i]!.id,
      name: usable[i]!.name,
    }));
    groups.push({
      id: `g-${members.map((m) => m.id).sort().join("-").slice(0, 80)}`,
      score: minEdge === 1 ? minRatio : minEdge,
      members,
    });
  }

  return groups.sort((a, b) => b.score - a.score || b.members.length - a.members.length);
}
