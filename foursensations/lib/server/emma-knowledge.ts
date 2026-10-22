import {
  bumpVersion,
  defaultEmmaKnowledge,
  normalizeEmmaKnowledgeBundle,
  normalizeEmmaKnowledgeState,
  type EmmaKnowledgeBundle,
  type EmmaKnowledgeState,
} from "@/lib/emma/knowledge";
import { getSiteSettingsData, mergeSiteSettingsData } from "@/lib/server/site-settings";

export async function getEmmaKnowledgeState(): Promise<EmmaKnowledgeState> {
  const data = await getSiteSettingsData();
  return normalizeEmmaKnowledgeState(data.emmaKnowledge);
}

/** Versión que usa la tienda: publicada, o pack por defecto si aún no hay publicación. */
export async function getPublishedEmmaKnowledge(): Promise<EmmaKnowledgeBundle> {
  const state = await getEmmaKnowledgeState();
  return state.published ?? defaultEmmaKnowledge("default-code");
}

export async function saveEmmaDraft(raw: unknown): Promise<EmmaKnowledgeState> {
  const state = await getEmmaKnowledgeState();
  const draft = normalizeEmmaKnowledgeBundle({
    ...(typeof raw === "object" && raw ? raw : {}),
    updatedAt: new Date().toISOString(),
  });
  const next: EmmaKnowledgeState = { ...state, draft };
  await mergeSiteSettingsData({ emmaKnowledge: next });
  return next;
}

export async function publishEmmaDraft(note = ""): Promise<EmmaKnowledgeState> {
  const state = await getEmmaKnowledgeState();
  const version = bumpVersion(state.published?.version ?? state.draft.version);
  const published = normalizeEmmaKnowledgeBundle({
    ...state.draft,
    version,
    updatedAt: new Date().toISOString(),
    note: note.trim() || state.draft.note || `Publicación ${version}`,
  });
  const historyItem = {
    at: new Date().toISOString(),
    note: published.note || "",
    version: published.version,
    bundle: published,
  };
  const next: EmmaKnowledgeState = {
    draft: published,
    published,
    history: [historyItem, ...state.history].slice(0, 30),
  };
  await mergeSiteSettingsData({ emmaKnowledge: next });
  return next;
}

export async function restoreEmmaHistory(index: number): Promise<EmmaKnowledgeState> {
  const state = await getEmmaKnowledgeState();
  const item = state.history[index];
  if (!item) throw new Error("Versión no encontrada");
  const draft = normalizeEmmaKnowledgeBundle({
    ...item.bundle,
    updatedAt: new Date().toISOString(),
    note: `Restaurado desde ${item.version}`,
  });
  const next: EmmaKnowledgeState = { ...state, draft };
  await mergeSiteSettingsData({ emmaKnowledge: next });
  return next;
}

export async function resetEmmaDraftToDefault(): Promise<EmmaKnowledgeState> {
  const state = await getEmmaKnowledgeState();
  const draft = defaultEmmaKnowledge("Reset a pack Excel FINAL_P1");
  const next: EmmaKnowledgeState = { ...state, draft };
  await mergeSiteSettingsData({ emmaKnowledge: next });
  return next;
}
