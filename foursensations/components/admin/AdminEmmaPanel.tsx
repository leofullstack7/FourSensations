"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/api/admin-fetch";
import {
  EMMA_QUESTIONS,
  buildEmmaRoutine,
  type EmmaAnswers,
  validateEmmaAnswers,
} from "@/lib/emma/flow";
import { buildWhyForMeLines } from "@/lib/emma/explanations";
import {
  defaultEmmaKnowledge,
  type EmmaKnowledgeBundle,
  type EmmaKnowledgeState,
} from "@/lib/emma/knowledge";

type Props = {
  active: boolean;
  showToast: (msg: string, type?: string, icon?: string) => void;
};

const EMPTY: Partial<EmmaAnswers> = {
  hairType: undefined,
  processes: [],
  feelings: [],
  scalp: [],
  priority: undefined,
  exposure: [],
};

type TabId = "sim" | "draft" | "publish" | "history";

export function AdminEmmaPanel({ active, showToast }: Props) {
  const [tab, setTab] = useState<TabId>("sim");
  const [answers, setAnswers] = useState<Partial<EmmaAnswers>>(EMPTY);
  const [state, setState] = useState<EmmaKnowledgeState | null>(null);
  const [edit, setEdit] = useState<EmmaKnowledgeBundle>(defaultEmmaKnowledge());
  const [busy, setBusy] = useState(false);
  const [publishNote, setPublishNote] = useState("");
  const [simSource, setSimSource] = useState<"draft" | "published">("draft");

  const load = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/emma/knowledge");
      const data = (await res.json()) as EmmaKnowledgeState & { error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo cargar Emma");
      setState(data);
      setEdit(data.draft);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error cargando Emma", "danger", "⚠️");
    }
  }, [showToast]);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const kbForSim = useMemo(() => {
    if (simSource === "published" && state?.published) return state.published;
    return edit;
  }, [simSource, state?.published, edit]);

  const result = useMemo(() => {
    const valid = validateEmmaAnswers(answers);
    if (!valid) return null;
    return buildEmmaRoutine(valid, kbForSim);
  }, [answers, kbForSim]);

  const why = useMemo(() => {
    if (!result) return [];
    return buildWhyForMeLines(
      [result.baseWash, ...(result.alternativeWash ? [result.alternativeWash] : []), ...result.primary, ...result.extras],
      undefined,
      kbForSim,
    );
  }, [result, kbForSim]);

  const saveDraft = async () => {
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/emma/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: edit }),
      });
      const data = (await res.json()) as EmmaKnowledgeState & { error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setState(data);
      setEdit(data.draft);
      showToast("Borrador Emma guardado", "success", "💾");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", "danger", "⚠️");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!confirm("¿Publicar el borrador? La tienda usará esta versión de inmediato.")) return;
    setBusy(true);
    try {
      await saveDraft();
      const res = await adminFetch("/api/admin/emma/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", note: publishNote }),
      });
      const data = (await res.json()) as EmmaKnowledgeState & { error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo publicar");
      setState(data);
      setEdit(data.draft);
      setPublishNote("");
      showToast(`Emma publicada v${data.published?.version}`, "success", "🚀");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", "danger", "⚠️");
    } finally {
      setBusy(false);
    }
  };

  const resetDefault = async () => {
    if (!confirm("¿Restablecer el borrador al pack Excel FINAL_P1?")) return;
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/emma/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = (await res.json()) as EmmaKnowledgeState & { error?: string };
      if (!res.ok) throw new Error(data.error || "Error");
      setState(data);
      setEdit(data.draft);
      showToast("Borrador restablecido al pack base", "success", "✅");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", "danger", "⚠️");
    } finally {
      setBusy(false);
    }
  };

  const restore = async (index: number) => {
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/emma/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", index }),
      });
      const data = (await res.json()) as EmmaKnowledgeState & { error?: string };
      if (!res.ok) throw new Error(data.error || "Error");
      setState(data);
      setEdit(data.draft);
      setTab("draft");
      showToast("Versión restaurada al borrador", "success", "🕘");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error", "danger", "⚠️");
    } finally {
      setBusy(false);
    }
  };

  if (!active) return null;

  const setSingle = (field: "hairType" | "priority", id: string) => {
    setAnswers((prev) => ({ ...prev, [field]: id }));
  };

  const toggleMulti = (field: "processes" | "feelings" | "scalp" | "exposure", id: string, qId: number) => {
    setAnswers((prev) => {
      if (qId === 2 && id === "natural") return { ...prev, processes: ["natural"] };
      if (qId === 4 && id === "ninguno") return { ...prev, scalp: ["ninguno"] };
      if (qId === 6 && id === "ninguna") return { ...prev, exposure: ["ninguna"] };
      const cur = [...(prev[field] ?? [])];
      let next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      if (qId === 2) next = next.filter((x) => x !== "natural");
      if (qId === 4) next = next.filter((x) => x !== "ninguno");
      if (qId === 6) next = next.filter((x) => x !== "ninguna");
      return { ...prev, [field]: next };
    });
  };

  const washKeys = ["seco", "graso", "normal", "caspa_acumulacion"] as const;

  return (
    <div className="admin-emma">
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {(
          [
            ["sim", "Simulador"],
            ["draft", "Borrador"],
            ["publish", "Publicar"],
            ["history", "Historial"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`btn btn-sm ${tab === id ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
          Publicado: {state?.published?.version ?? "— (usa pack por defecto)"} · Borrador: {edit.version}
        </span>
      </div>

      {tab === "sim" ? (
        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)" }}>
          <div>
            <div style={{ marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className={`btn btn-sm ${simSource === "draft" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setSimSource("draft")}
              >
                Simular borrador
              </button>
              <button
                type="button"
                className={`btn btn-sm ${simSource === "published" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setSimSource("published")}
                disabled={!state?.published}
              >
                Simular publicado
              </button>
            </div>
            {EMMA_QUESTIONS.map((q) => (
              <div key={q.id} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  P{q.id}. {edit.questionPrompts[String(q.id)] || q.prompt}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {q.options.map((opt) => {
                    const field =
                      q.id === 1
                        ? "hairType"
                        : q.id === 2
                          ? "processes"
                          : q.id === 3
                            ? "feelings"
                            : q.id === 4
                              ? "scalp"
                              : q.id === 5
                                ? "priority"
                                : "exposure";
                    const isOn =
                      q.mode === "single"
                        ? answers[field as "hairType" | "priority"] === opt.id
                        : (answers[field as "processes" | "feelings" | "scalp" | "exposure"] ?? []).includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`btn btn-sm ${isOn ? "btn-primary" : "btn-outline"}`}
                        onClick={() => {
                          if (q.mode === "single") setSingle(field as "hairType" | "priority", opt.id);
                          else toggleMulti(field as "processes" | "feelings" | "scalp" | "exposure", opt.id, q.id);
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              border: "1px solid rgba(200,168,162,0.4)",
              borderRadius: 16,
              padding: 16,
              background: "linear-gradient(180deg,#fff,#faf7f4)",
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Resultado ({simSource})</h3>
            {!result ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Completa P1 y P5 para simular.</p>
            ) : (
              <>
                <p style={{ fontSize: 13 }}>{result.summary}</p>
                <p style={{ fontSize: 13 }}>
                  <strong>Base:</strong> {result.baseWash.productKey}
                </p>
                <p style={{ fontSize: 13 }}>
                  <strong>Alternativa:</strong> {result.alternativeWash?.productKey ?? "—"}
                </p>
                <ul style={{ fontSize: 13, paddingLeft: 18 }}>
                  {result.primary.map((p) => (
                    <li key={p.productKey}>
                      {p.productKey} <em>({p.evidence})</em>
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: 12, fontWeight: 700 }}>¿Por qué?</p>
                <ul style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 18 }}>
                  {why.map((w) => (
                    <li key={w.productKey}>
                      <strong>{w.productKey}:</strong> {w.text}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      ) : null}

      {tab === "draft" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Edita textos, bases P1 y asociaciones P5. Las reglas inmutables (P1 siempre visible, Scalp solo alternativa, no pad)
            siguen en el motor.
          </p>
          <div className="form-group">
            <label className="form-label">Intro</label>
            <textarea
              className="form-input"
              rows={3}
              value={edit.intro}
              onChange={(e) => setEdit({ ...edit, intro: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Texto de carga</label>
            <input
              className="form-input"
              value={edit.loadingText}
              onChange={(e) => setEdit({ ...edit, loadingText: e.target.value })}
            />
          </div>
          <h4 style={{ margin: 0 }}>Bases de lavado P1</h4>
          {washKeys.map((k) => (
            <div key={k} style={{ display: "grid", gap: 8, gridTemplateColumns: "120px 1fr 1fr" }}>
              <strong style={{ fontSize: 13, alignSelf: "center" }}>{k}</strong>
              <input
                className="form-input"
                value={edit.washByP1[k].key}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    washByP1: { ...edit.washByP1, [k]: { ...edit.washByP1[k], key: e.target.value } },
                  })
                }
                placeholder="Producto"
              />
              <input
                className="form-input"
                value={edit.washByP1[k].reason}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    washByP1: { ...edit.washByP1, [k]: { ...edit.washByP1[k], reason: e.target.value } },
                  })
                }
                placeholder="Razón"
              />
            </div>
          ))}
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <div className="form-group">
              <label className="form-label">Key alternativa Scalp</label>
              <input
                className="form-input"
                value={edit.scalpAlternativeKey}
                onChange={(e) => setEdit({ ...edit, scalpAlternativeKey: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Key Scrub Glow</label>
              <input
                className="form-input"
                value={edit.scrubGlowKey}
                onChange={(e) => setEdit({ ...edit, scrubGlowKey: e.target.value })}
              />
            </div>
          </div>
          <h4 style={{ margin: 0 }}>P5 → productos (coma-separados)</h4>
          {Object.keys(edit.p5Products).map((pid) => (
            <div key={pid} className="form-group">
              <label className="form-label">{pid}</label>
              <input
                className="form-input"
                value={(edit.p5Products[pid] ?? []).join(", ")}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    p5Products: {
                      ...edit.p5Products,
                      [pid]: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  })
                }
              />
            </div>
          ))}
          <h4 style={{ margin: 0 }}>Prompts P1–P6</h4>
          {["1", "2", "3", "4", "5", "6"].map((id) => (
            <div key={id} className="form-group">
              <label className="form-label">P{id}</label>
              <input
                className="form-input"
                value={edit.questionPrompts[id] ?? ""}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    questionPrompts: { ...edit.questionPrompts, [id]: e.target.value },
                  })
                }
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveDraft()}>
              Guardar borrador
            </button>
            <button type="button" className="btn btn-outline" disabled={busy} onClick={() => void resetDefault()}>
              Reset Excel base
            </button>
          </div>
        </div>
      ) : null}

      {tab === "publish" ? (
        <div style={{ maxWidth: 560 }}>
          <p style={{ fontSize: 13, lineHeight: 1.5 }}>
            La publicación es atómica: el borrador pasa a <strong>publicado</strong> y queda en historial. La tienda usa esa
            versión en el cuestionario.
          </p>
          <div className="form-group">
            <label className="form-label">Nota de publicación</label>
            <input
              className="form-input"
              value={publishNote}
              onChange={(e) => setPublishNote(e.target.value)}
              placeholder="Ej. Ajuste copy P1 Graso"
            />
          </div>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void publish()}>
            Publicar ahora
          </button>
          {state?.published ? (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
              Actual en producción: v{state.published.version} · {state.published.updatedAt}
              {state.published.note ? ` · ${state.published.note}` : ""}
            </p>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
              Aún no hay publicación: la tienda usa el pack por defecto del código.
            </p>
          )}
        </div>
      ) : null}

      {tab === "history" ? (
        <div>
          {(state?.history ?? []).length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sin publicaciones aún.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {state!.history.map((h, i) => (
                <li
                  key={`${h.version}-${h.at}`}
                  style={{
                    border: "1px solid rgba(200,168,162,0.35)",
                    borderRadius: 12,
                    padding: 12,
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <strong>v{h.version}</strong>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {h.at} · {h.note || "Sin nota"}
                    </div>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void restore(i)}>
                    Restaurar a borrador
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
