"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MotionDiv, MotionSpan } from "@/components/store/store-framer-motion";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import {
  ADVISOR_QUICK_PROMPTS,
  ADVISOR_RULES_LLM_THRESHOLD,
  buildAdvisorReply,
  buildAdvisorReplyForQuickPrompt,
  type AdvisorHistoryTurn,
  type AdvisorQuickPromptId,
  type AiAdvisorReply,
  type AiChatMessage,
} from "@/lib/ai-advisor";
import { getWhatsAppHref, WHATSAPP_DEFAULT_MESSAGE } from "@/lib/storefront-contact";
import { formatPrice } from "@/lib/format";

const QUICK_PROMPTS = ADVISOR_QUICK_PROMPTS;

const WELCOME: AiChatMessage = {
  id: "welcome",
  role: "bot",
  text: "Hola, soy Ginna AI ✨ Cuéntame qué quieres cuidar — piel, cabello, maquillaje, tintes o un regalo. Respondo con productos de nuestro catálogo y te conecto con el equipo cuando hace falta.",
};

function nextId(): string {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function toHistoryTurns(messages: AiChatMessage[]): AdvisorHistoryTurn[] {
  return messages
    .filter((m) => m.id !== "welcome")
    .map((m) => ({ role: m.role, text: m.text }));
}

async function fetchAdvisorReply(message: string, history: AdvisorHistoryTurn[]): Promise<AiAdvisorReply | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch("/api/store/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) return null;
    return (await res.json()) as AiAdvisorReply;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function rulesReplyHasProducts(reply: AiAdvisorReply): boolean {
  return reply.messages.some((m) => (m.productIds?.length ?? 0) > 0);
}

type PushReplyOptions = {
  /** Chip predeterminado: respuesta local instantánea, cero tokens. */
  quickPromptId?: AdvisorQuickPromptId;
};

export function BeautyAiAdvisor() {
  const { catalogProducts, ensureFullCatalog, openProductModal, openSearchWithQuery } = useStorefrontUi();
  const [messages, setMessages] = useState<AiChatMessage[]>([WELCOME]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const catalogEnsured = useRef(false);
  const inputId = useId();
  const whatsappHref = getWhatsAppHref(WHATSAPP_DEFAULT_MESSAGE);

  useEffect(() => {
    if (catalogProducts.length > 0 || catalogEnsured.current) return;
    catalogEnsured.current = true;
    setCatalogLoading(true);
    void ensureFullCatalog().finally(() => setCatalogLoading(false));
  }, [catalogProducts.length, ensureFullCatalog]);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  const pushReply = useCallback(
    (userText: string, options?: PushReplyOptions) => {
      const userMsg: AiChatMessage = { id: nextId(), role: "user", text: userText };
      let historyForApi: AdvisorHistoryTurn[] = [];

      setMessages((prev) => {
        const withUser = [...prev, userMsg].slice(-16);
        historyForApi = toHistoryTurns(withUser);
        return withUser;
      });

      setTyping(true);

      const userHistory = historyForApi.filter((h) => h.role === "user").map((h) => h.text);
      const isInstant = Boolean(options?.quickPromptId);

      void (async () => {
        if (isInstant) {
          await new Promise((r) => window.setTimeout(r, 90));
        }

        let reply: AiAdvisorReply | null = null;

        if (options?.quickPromptId && catalogProducts.length > 0) {
          reply = buildAdvisorReplyForQuickPrompt(options.quickPromptId, catalogProducts);
        } else if (catalogProducts.length > 0) {
          const localRules = buildAdvisorReply(userText, catalogProducts, {
            history: userHistory,
            engine: "rules",
          });
          if (localRules.confidence >= ADVISOR_RULES_LLM_THRESHOLD && rulesReplyHasProducts(localRules)) {
            reply = localRules;
          }
        }

        if (!reply) {
          reply = await fetchAdvisorReply(userText, historyForApi);
        }

        if (!reply) {
          reply = buildAdvisorReply(userText, catalogProducts, {
            history: userHistory,
            engine: "rules",
          });
        }

        const botMsgs: AiChatMessage[] = reply.messages.map((m) => ({
          ...m,
          id: nextId(),
        }));

        setMessages((current) => [...current, ...botMsgs].slice(-16));
        setTyping(false);
      })();
    },
    [catalogProducts],
  );

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || typing) return;
    setDraft("");
    pushReply(text);
  }, [draft, typing, pushReply]);

  const handleQuickPrompt = useCallback(
    (promptId: AdvisorQuickPromptId, text: string) => {
      if (typing) return;
      pushReply(text, { quickPromptId: promptId });
    },
    [typing, pushReply],
  );

  const productMap = new Map(catalogProducts.map((p) => [p.id, p]));

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
            Descubre con <em>IA</em>
          </h2>
          <p className="gb-ai-desc">
            Conversa como en un chat: describe tu rutina, tu tipo de piel o lo que buscas. Consulto el catálogo
            real de GinnaBeauty — nombre, categoría, etiquetas y descripción — y te sugiero productos concretos.
          </p>
          <ul className="gb-ai-features">
            <li>Chat con contexto</li>
            <li>Recomendaciones del catálogo</li>
            <li>Asesora humana si lo necesitas</li>
          </ul>
          {catalogLoading ? (
            <p className="gb-ai-catalog-hint" style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              Sincronizando catálogo…
            </p>
          ) : null}
        </div>

        <MotionDiv
          className="gb-ai-console gb-ai-console--chat"
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

          <div className="gb-ai-chat gb-ai-chat--thread" role="log" aria-live="polite" aria-relevant="additions">
            {messages.map((msg) => (
              <div key={msg.id} className={`gb-ai-msg gb-ai-msg--${msg.role}`}>
                {msg.role === "bot" && <span className="gb-ai-msg-avatar" aria-hidden>✦</span>}
                <div className="gb-ai-msg-body">
                  <p>{msg.text}</p>
                  {msg.productIds && msg.productIds.length > 0 && (
                    <div className="gb-ai-product-picks">
                      {msg.productIds.map((id) => {
                        const p = productMap.get(id);
                        if (!p) return null;
                        const hint = msg.productHints?.[id];
                        return (
                          <button
                            key={id}
                            type="button"
                            className="gb-ai-product-pick"
                            onClick={() => openProductModal(id)}
                          >
                            <span className="gb-ai-product-pick-emoji" aria-hidden>
                              {p.emoji || "✨"}
                            </span>
                            <span className="gb-ai-product-pick-copy">
                              <span className="gb-ai-product-pick-name">{p.name}</span>
                              <span className="gb-ai-product-pick-meta">
                                {hint ? `${hint} · ` : ""}
                                {p.brand} · {formatPrice(p.price)}
                              </span>
                            </span>
                            <span className="gb-ai-product-pick-arrow" aria-hidden>→</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {msg.action && (
                    <div className="gb-ai-msg-actions">
                      {msg.action.kind === "whatsapp" && whatsappHref ? (
                        <a href={whatsappHref} className="gb-ai-msg-action" target="_blank" rel="noopener noreferrer">
                          {msg.action.label}
                        </a>
                      ) : null}
                      {msg.action.kind === "search" && msg.action.query ? (
                        <button
                          type="button"
                          className="gb-ai-msg-action"
                          onClick={() => openSearchWithQuery(msg.action!.query!)}
                        >
                          {msg.action.label}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="gb-ai-msg gb-ai-msg--bot gb-ai-msg--typing">
                <span className="gb-ai-msg-avatar" aria-hidden>✦</span>
                <div className="gb-ai-msg-body">
                  <span className="gb-ai-typing-bubble" aria-label="Escribiendo">
                    <span /><span /><span />
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="gb-ai-chips">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="gb-ai-chip"
                disabled={typing}
                onClick={() => handleQuickPrompt(p.id, p.text)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <form
            className="gb-ai-composer"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <label htmlFor={inputId} className="sr-only">
              Escribe tu consulta de belleza
            </label>
            <input
              id={inputId}
              type="text"
              className="gb-ai-input"
              placeholder="Ej. tengo el cabello rizado y seco…"
              value={draft}
              disabled={typing}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="gb-ai-send" disabled={typing || !draft.trim()} aria-label="Enviar">
              ↑
            </button>
          </form>
        </MotionDiv>
      </div>
    </section>
  );
}
