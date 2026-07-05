"use client";

import { useCallback, useState } from "react";
import { MotionDiv, MotionSpan } from "@/components/store/store-framer-motion";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";

const AI_PROMPTS = [
  {
    id: "skin",
    label: "Rutina de piel",
    query: "serum hidratante piel",
    icon: "✨",
  },
  {
    id: "hair",
    label: "Cabello dañado",
    query: "tratamiento capilar reparador",
    icon: "💆",
  },
  {
    id: "makeup",
    label: "Look luminoso",
    query: "base maquillaje glow",
    icon: "💄",
  },
  {
    id: "gift",
    label: "Regalo especial",
    query: "combo regalo belleza",
    icon: "🎁",
  },
] as const;

export function BeautyAiAdvisor() {
  const { openSearchWithQuery, showToast } = useStorefrontUi();
  const [activeId, setActiveId] = useState<string>(AI_PROMPTS[0]!.id);
  const [typing, setTyping] = useState(false);

  const active = AI_PROMPTS.find((p) => p.id === activeId) ?? AI_PROMPTS[0]!;

  const runPrompt = useCallback(
    (query: string, label: string) => {
      setTyping(true);
      window.setTimeout(() => {
        setTyping(false);
        openSearchWithQuery(query);
        showToast(`Buscando: ${label}`, "default", "🤖");
      }, 650);
    },
    [openSearchWithQuery, showToast]
  );

  return (
    <section className="gb-ai-section section-pad" aria-labelledby="gb-ai-title">
      <div className="gb-ai-bg" aria-hidden>
        <div className="gb-ai-orb gb-ai-orb--1" />
        <div className="gb-ai-orb gb-ai-orb--2" />
        <div className="gb-ai-grid" />
      </div>
      <div className="container gb-ai-inner reveal">
        <div className="gb-ai-copy">
          <MotionSpan
            className="gb-ai-badge"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="gb-ai-pulse" aria-hidden />
            Inteligencia Ginna · IA
          </MotionSpan>
          <h2 id="gb-ai-title" className="gb-ai-title">
            Tu asesora de belleza <em>inteligente</em>
          </h2>
          <p className="gb-ai-desc">
            Descubre productos en segundos con sugerencias curadas según lo que buscas hoy. Tecnología
            que entiende tu estilo, con el toque humano de GinnaBeauty.
          </p>
          <ul className="gb-ai-features">
            <li>Recomendaciones instantáneas</li>
            <li>Curaduría premium verificada</li>
            <li>Experiencia personalizada</li>
          </ul>
        </div>

        <MotionDiv
          className="gb-ai-console"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          <div className="gb-ai-console-header">
            <span className="gb-ai-dot gb-ai-dot--rose" />
            <span className="gb-ai-dot gb-ai-dot--gold" />
            <span className="gb-ai-dot gb-ai-dot--sage" />
            <span className="gb-ai-console-label">Ginna AI · en línea</span>
          </div>
          <div className="gb-ai-chat">
            <div className="gb-ai-msg gb-ai-msg--bot">
              Hola ✨ ¿Qué te gustaría potenciar hoy? Elige una opción o explora el catálogo.
            </div>
            <div className={`gb-ai-msg gb-ai-msg--user${typing ? " gb-ai-msg--typing" : ""}`}>
              {typing ? (
                <>
                  Buscando <span className="gb-ai-typing-dots" aria-hidden>...</span>
                </>
              ) : (
                <>Quiero ideas para: {active.label}</>
              )}
            </div>
          </div>
          <div className="gb-ai-chips">
            {AI_PROMPTS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`gb-ai-chip${activeId === p.id ? " active" : ""}`}
                onClick={() => setActiveId(p.id)}
              >
                <span aria-hidden>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary gb-ai-cta"
            onClick={() => runPrompt(active.query, active.label)}
            disabled={typing}
          >
            {typing ? "Analizando…" : "✦ Descubrir con IA"}
          </button>
        </MotionDiv>
      </div>
    </section>
  );
}
