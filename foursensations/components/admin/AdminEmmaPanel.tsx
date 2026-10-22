"use client";

import { useMemo, useState } from "react";
import {
  EMMA_QUESTIONS,
  buildEmmaRoutine,
  type EmmaAnswers,
  validateEmmaAnswers,
} from "@/lib/emma/flow";
import { buildWhyForMeLines } from "@/lib/emma/explanations";

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

export function AdminEmmaPanel({ active, showToast }: Props) {
  const [draft, setDraft] = useState<Partial<EmmaAnswers>>(EMPTY);
  const [tab, setTab] = useState<"sim" | "rules">("sim");

  const result = useMemo(() => {
    const valid = validateEmmaAnswers(draft);
    if (!valid) return null;
    return buildEmmaRoutine(valid);
  }, [draft]);

  const why = useMemo(() => {
    if (!result) return [];
    const items = [
      result.baseWash,
      ...(result.alternativeWash ? [result.alternativeWash] : []),
      ...result.primary,
      ...result.extras,
    ];
    return buildWhyForMeLines(items);
  }, [result]);

  if (!active) return null;

  const setSingle = (field: "hairType" | "priority", id: string) => {
    setDraft((prev) => ({ ...prev, [field]: id }));
  };

  const toggleMulti = (field: "processes" | "feelings" | "scalp" | "exposure", id: string, qId: number) => {
    setDraft((prev) => {
      const cur = [...(prev[field] ?? [])];
      if (qId === 2 && id === "natural") return { ...prev, processes: ["natural"] };
      if (qId === 4 && id === "ninguno") return { ...prev, scalp: ["ninguno"] };
      if (qId === 6 && id === "ninguna") return { ...prev, exposure: ["ninguna"] };
      let next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      if (qId === 2) next = next.filter((x) => x !== "natural");
      if (qId === 4) next = next.filter((x) => x !== "ninguno");
      if (qId === 6) next = next.filter((x) => x !== "ninguna");
      return { ...prev, [field]: next };
    });
  };

  const runCase = (partial: Partial<EmmaAnswers>, label: string) => {
    setDraft({ ...EMPTY, ...partial });
    setTab("sim");
    showToast(`Caso «${label}» cargado en el simulador`, "success", "🧪");
  };

  return (
    <div className="admin-emma">
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button type="button" className={`btn btn-sm ${tab === "sim" ? "btn-primary" : "btn-outline"}`} onClick={() => setTab("sim")}>
          Simulador
        </button>
        <button type="button" className={`btn btn-sm ${tab === "rules" ? "btn-primary" : "btn-outline"}`} onClick={() => setTab("rules")}>
          Reglas publicadas
        </button>
      </div>

      {tab === "rules" ? (
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text)" }}>
          <p>
            <strong>Base P1 (inmutable):</strong> Seco → Tentación Nutrición · Graso → Tentación Equilibrio · Normal → Botanical ·
            Caspa/acumulación → Scalp Therapy.
          </p>
          <p>
            <strong>Alternativa:</strong> Scalp Therapy solo si P4 (grasa/caspa/descamación/acumulación) o P5 (controlar grasa /
            cuidar caspa), y nunca si ya es la base.
          </p>
          <p>
            <strong>P5</strong> manda el tratamiento protagonista; P3 desempatá; P4 cubre raíz; P6 protege. Sin relleno forzado a 5
            productos. Botanical nunca se explica como detox/anticaspa.
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            Fuentes: <code>lib/emma/source/*.xlsx</code> + instructivo. El CRUD versionado completo (borrador → publicación) queda
            como siguiente iteración.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                runCase(
                  {
                    hairType: "graso",
                    processes: ["decoloracion"],
                    feelings: ["frizz", "opacidad"],
                    scalp: ["ninguno"],
                    priority: "brillo",
                    exposure: ["ninguna"],
                  },
                  "T01",
                )
              }
            >
              Cargar T01
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                runCase(
                  {
                    hairType: "graso",
                    processes: ["tinte"],
                    feelings: [],
                    scalp: ["caspa", "descamacion"],
                    priority: "caspa",
                    exposure: ["ninguna"],
                  },
                  "T02",
                )
              }
            >
              Cargar T02
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                runCase(
                  {
                    hairType: "seco",
                    processes: ["natural"],
                    feelings: ["resequedad", "dano", "enreda"],
                    scalp: ["ninguno"],
                    priority: "nutrir",
                    exposure: ["calor"],
                  },
                  "Caso A",
                )
              }
            >
              Cargar Caso A
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)" }}>
          <div>
            {EMMA_QUESTIONS.map((q) => (
              <div key={q.id} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  P{q.id}. {q.prompt}
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
                    const active =
                      q.mode === "single"
                        ? draft[field as "hairType" | "priority"] === opt.id
                        : (draft[field as "processes" | "feelings" | "scalp" | "exposure"] ?? []).includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`btn btn-sm ${active ? "btn-primary" : "btn-outline"}`}
                        onClick={() => {
                          if (q.mode === "single") {
                            setSingle(field as "hairType" | "priority", opt.id);
                          } else {
                            toggleMulti(field as "processes" | "feelings" | "scalp" | "exposure", opt.id, q.id);
                          }
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setDraft(EMPTY)}>
              Limpiar
            </button>
          </div>

          <div
            style={{
              border: "1px solid rgba(200,168,162,0.4)",
              borderRadius: 16,
              padding: 16,
              background: "linear-gradient(180deg,#fff,#faf7f4)",
              alignSelf: "start",
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Resultado del motor</h3>
            {!result ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                Completa P1 y P5 (mínimo) para simular. Ideal: las seis respuestas.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13, lineHeight: 1.5 }}>{result.summary}</p>
                <p style={{ fontSize: 13 }}>
                  <strong>Base P1:</strong> {result.baseWash.productKey}
                  <br />
                  <span style={{ color: "var(--text-muted)" }}>{result.baseWash.reason}</span>
                </p>
                {result.alternativeWash ? (
                  <p style={{ fontSize: 13 }}>
                    <strong>Alternativa:</strong> {result.alternativeWash.productKey}
                    <br />
                    <span style={{ color: "var(--text-muted)" }}>{result.alternativeWash.reason}</span>
                  </p>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sin alternativa de lavado.</p>
                )}
                <p style={{ fontSize: 13, marginBottom: 4 }}>
                  <strong>Módulos ({result.primary.length}):</strong>
                </p>
                <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 13 }}>
                  {result.primary.map((p) => (
                    <li key={p.productKey}>
                      {p.productKey} — <em>{p.evidence}</em>: {p.reason}
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: 13, marginBottom: 4 }}>
                  <strong>¿Por qué para mí?</strong>
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-muted)" }}>
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
      )}
    </div>
  );
}
