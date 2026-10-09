"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import emmaLogo from "@/assets/foursensations/emma.PNG";
import { MotionDiv, MotionSpan } from "@/components/store/store-framer-motion";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import {
  buildAdvisorReply,
  type AdvisorHistoryTurn,
  type AiAdvisorAction,
  type AiAdvisorReply,
  type AiChatMessage,
} from "@/lib/ai-advisor";
import { ADVISOR_MAX_TURNS } from "@/lib/ai-advisor-context";
import { JuliProductSlider } from "@/components/store/JuliProductSlider";
import { getWhatsAppHref, WHATSAPP_DEFAULT_MESSAGE } from "@/lib/storefront-contact";
import { preloadStorefrontProductImages } from "@/lib/preload-storefront-image";
import {
  buildEmmaRoutine,
  EMMA_CONTINUE_LABEL,
  EMMA_LOADING_TEXT,
  EMMA_QUESTIONS,
  EMMA_START_LABEL,
  EMMA_WELCOME,
  emptyEmmaAnswers,
  optionLabel,
  type EmmaAnswers,
  type EmmaQuestion,
  type EmmaQuestionId,
} from "@/lib/emma-quiz";
import { getStorefrontProductTitle } from "@/lib/product-storefront-copy";

const CHAT_STORAGE_KEY = "fs-emma-chat-v1";

const WELCOME: AiChatMessage = {
  id: "welcome",
  role: "bot",
  text: EMMA_WELCOME,
};

function nextId(): string {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function toHistoryTurns(messages: AiChatMessage[]): AdvisorHistoryTurn[] {
  return messages
    .filter((m) => m.id !== "welcome")
    .map((m) => ({
      role: m.role,
      text: m.text,
      ...(m.productIds?.length ? { productIds: m.productIds } : {}),
    }));
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

type QuizStep = "intro" | EmmaQuestionId | "loading" | "done";

function questionAfter(id: EmmaQuestionId): QuizStep {
  const idx = EMMA_QUESTIONS.findIndex((q) => q.id === id);
  const next = EMMA_QUESTIONS[idx + 1];
  return next ? next.id : "loading";
}

export function BeautyAiAdvisor() {
  const {
    catalogProducts,
    ensureFullCatalog,
    openProductModal,
    openSearchWithQuery,
    addToCart,
    toggleFavorite,
    favorites,
    showToast,
  } = useStorefrontUi();
  const [messages, setMessages] = useState<AiChatMessage[]>([WELCOME]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [quizStep, setQuizStep] = useState<QuizStep>("intro");
  const [answers, setAnswers] = useState<EmmaAnswers>(emptyEmmaAnswers);
  const [pendingMulti, setPendingMulti] = useState<string[]>([]);
  const chatThreadRef = useRef<HTMLDivElement>(null);
  const catalogEnsured = useRef(false);
  const inputId = useId();
  const whatsappHref = getWhatsAppHref(WHATSAPP_DEFAULT_MESSAGE);

  useEffect(() => {
    if (catalogProducts.length > 0 || catalogEnsured.current) return;
    catalogEnsured.current = true;
    setCatalogLoading(true);
    void ensureFullCatalog().finally(() => setCatalogLoading(false));
  }, [catalogProducts.length, ensureFullCatalog]);

  const scrollThreadToBottom = useCallback(() => {
    const thread = chatThreadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, []);

  useEffect(() => {
    scrollThreadToBottom();
  }, [messages, typing, quizStep, scrollThreadToBottom]);

  useEffect(() => {
    const byId = new Map(catalogProducts.map((p) => [p.id, p]));
    for (const msg of messages) {
      for (const id of msg.productIds ?? []) {
        preloadStorefrontProductImages(byId.get(id));
      }
    }
  }, [messages, catalogProducts]);

  const currentQuestion: EmmaQuestion | null = useMemo(
    () => EMMA_QUESTIONS.find((q) => q.id === quizStep) ?? null,
    [quizStep],
  );

  const pushBot = useCallback((text: string, extra?: Partial<AiChatMessage>) => {
    const msg: AiChatMessage = { id: nextId(), role: "bot", text, ...extra };
    setMessages((prev) => [...prev, msg].slice(-ADVISOR_MAX_TURNS));
  }, []);

  const pushUser = useCallback((text: string) => {
    const msg: AiChatMessage = { id: nextId(), role: "user", text };
    setMessages((prev) => [...prev, msg].slice(-ADVISOR_MAX_TURNS));
  }, []);

  const finishQuiz = useCallback(
    (finalAnswers: EmmaAnswers) => {
      setQuizStep("loading");
      setTyping(false);
      window.setTimeout(() => {
        const routine = buildEmmaRoutine(finalAnswers, catalogProducts);
        setMessages((prev) =>
          [
            ...prev,
            { id: nextId(), role: "bot" as const, text: routine.interpretation },
            {
              id: nextId(),
              role: "bot" as const,
              text: "Estas son las piezas Four Sensations que elegiría para ti 💗",
              productIds: routine.productIds,
              productHints: routine.productHints,
            },
            { id: nextId(), role: "bot" as const, text: routine.why },
          ].slice(-ADVISOR_MAX_TURNS),
        );
        setQuizStep("done");
      }, 1600);
    },
    [catalogProducts],
  );

  const goToQuestion = useCallback((step: QuizStep) => {
    setPendingMulti([]);
    setQuizStep(step);
    if (step !== "intro" && step !== "loading" && step !== "done") {
      const q = EMMA_QUESTIONS.find((row) => row.id === step);
      if (q) pushBot(q.text);
    }
  }, [pushBot]);

  const applyAnswer = useCallback(
    (question: EmmaQuestion, selectedIds: string[]) => {
      const labels = selectedIds.map((id) => optionLabel(question.id, id)).join(", ");
      pushUser(labels);
      const nextAnswers: EmmaAnswers = { ...answers };
      if (question.id === "feel" || question.id === "priority") {
        nextAnswers[question.id] = selectedIds[0];
      } else if (question.id === "history") {
        nextAnswers.history = selectedIds;
      } else if (question.id === "symptoms") {
        nextAnswers.symptoms = selectedIds;
      } else if (question.id === "scalp") {
        nextAnswers.scalp = selectedIds;
      } else {
        nextAnswers.exposure = selectedIds;
      }
      setAnswers(nextAnswers);
      pushBot(question.reaction);
      const next = questionAfter(question.id);
      if (next === "loading") {
        finishQuiz(nextAnswers);
        return;
      }
      window.setTimeout(() => goToQuestion(next), 280);
    },
    [answers, finishQuiz, goToQuestion, pushBot, pushUser],
  );

  const startQuiz = useCallback(() => {
    if (quizStep !== "intro") return;
    pushUser(EMMA_START_LABEL);
    window.setTimeout(() => goToQuestion("feel"), 220);
  }, [goToQuestion, pushUser, quizStep]);

  const handleSingleOption = useCallback(
    (question: EmmaQuestion, optionId: string) => {
      applyAnswer(question, [optionId]);
    },
    [applyAnswer],
  );

  const toggleMultiOption = useCallback((question: EmmaQuestion, optionId: string) => {
    setPendingMulti((prev) => {
      if (question.id === "scalp" && optionId === "ninguna") return prev.includes("ninguna") ? [] : ["ninguna"];
      const withoutNone = prev.filter((id) => id !== "ninguna");
      return withoutNone.includes(optionId) ? withoutNone.filter((id) => id !== optionId) : [...withoutNone, optionId];
    });
  }, []);

  const confirmMulti = useCallback(
    (question: EmmaQuestion) => {
      if (pendingMulti.length === 0) return;
      applyAnswer(question, pendingMulti);
    },
    [applyAnswer, pendingMulti],
  );

  const pushReply = useCallback(
    (userText: string) => {
      const userMsg: AiChatMessage = { id: nextId(), role: "user", text: userText };
      let historyForApi: AdvisorHistoryTurn[] = [];

      setMessages((prev) => {
        const withUser = [...prev, userMsg].slice(-ADVISOR_MAX_TURNS);
        historyForApi = toHistoryTurns(withUser);
        return withUser;
      });

      setTyping(true);

      void (async () => {
        let reply: AiAdvisorReply | null = await fetchAdvisorReply(userText, historyForApi);
        if (!reply) {
          reply = buildAdvisorReply(userText, catalogProducts, {
            historyTurns: historyForApi,
            engine: "rules",
          });
        }
        const botMsgs: AiChatMessage[] = reply.messages.map((m) => ({
          ...m,
          id: nextId(),
        }));
        setMessages((current) => [...current, ...botMsgs].slice(-ADVISOR_MAX_TURNS));
        setTyping(false);
      })();
    },
    [catalogProducts],
  );

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || typing || quizStep !== "done") return;
    setDraft("");
    pushReply(text);
  }, [draft, typing, pushReply, quizStep]);

  const productMap = useMemo(
    () => new Map(catalogProducts.map((p) => [p.id, p])),
    [catalogProducts],
  );

  const scrollToCatalog = useCallback(() => {
    document.getElementById("products-grid-main")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const renderAction = useCallback(
    (action: AiAdvisorAction, key: string) => {
      if (action.kind === "whatsapp" && whatsappHref) {
        return (
          <a key={key} href={whatsappHref} className="gb-ai-msg-action" target="_blank" rel="noopener noreferrer">
            {action.label}
          </a>
        );
      }
      if (action.kind === "search" && action.query) {
        return (
          <button key={key} type="button" className="gb-ai-msg-action" onClick={() => openSearchWithQuery(action.query!)}>
            {action.label}
          </button>
        );
      }
      if (action.kind === "catalog") {
        return (
          <button key={key} type="button" className="gb-ai-msg-action" onClick={scrollToCatalog}>
            {action.label}
          </button>
        );
      }
      if (action.kind === "cart" && action.productId) {
        return (
          <button
            key={key}
            type="button"
            className="gb-ai-msg-action"
            onClick={() => {
              const p = productMap.get(action.productId!);
              addToCart(action.productId!, p);
            }}
          >
            {action.label}
          </button>
        );
      }
      if (action.kind === "wishlist" && action.productId) {
        return (
          <button
            key={key}
            type="button"
            className="gb-ai-msg-action"
            onClick={() => {
              toggleFavorite(action.productId!);
              showToast("Guardado en favoritos", "success", "♡");
            }}
          >
            {action.label}
          </button>
        );
      }
      return null;
    },
    [whatsappHref, openSearchWithQuery, scrollToCatalog, addToCart, toggleFavorite, showToast, productMap],
  );

  const restartQuiz = useCallback(() => {
    setMessages([WELCOME]);
    setAnswers(emptyEmmaAnswers());
    setPendingMulti([]);
    setQuizStep("intro");
    try {
      sessionStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <section className="gb-ai-section section-pad juli-ai emma-ai" aria-labelledby="gb-ai-title">
      <div className="gb-ai-bg" aria-hidden>
        <div className="gb-ai-orb gb-ai-orb--1" />
        <div className="gb-ai-orb gb-ai-orb--2" />
        <div className="gb-ai-heart" />
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
            En vivo · aliada capilar
          </MotionSpan>
          <h2 id="gb-ai-title" className="emma-logo-title">
            <Image
              src={emmaLogo}
              alt="Emma"
              className="emma-logo emma-logo--hero"
              sizes="(max-width: 720px) 82vw, 420px"
              priority
            />
          </h2>
          <p className="gb-ai-kicker">Tu aliada capilar Four Sensations</p>
          <p className="gb-ai-desc">
            Hola, soy Emma 💗 Te escucho primero y al final te armo una rutina con los productos Four
            Sensations que mejor se adaptan a tu cabello.
            <br />
            <br />
            ¿Frizz, resequedad, caída, grasa, caspa o daño? Cuéntame qué necesita tu pelo y juntas
            encontramos el ritual 👱🏻‍♀️🌸
          </p>
          <ul className="gb-ai-hearts" aria-label="Cómo te acompaña Emma">
            <li>
              <span className="gb-ai-heart-shape" aria-hidden>
                ♥
              </span>
              <strong>TE ESCUCHO</strong>
            </li>
            <li>
              <span className="gb-ai-heart-shape" aria-hidden>
                ♥
              </span>
              <strong>TE GUÍO</strong>
            </li>
            <li>
              <span className="gb-ai-heart-shape" aria-hidden>
                ♥
              </span>
              <strong>TE RECOMIENDO</strong>
            </li>
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
            <span className="emma-avatar-chip" aria-hidden>
              <Image src={emmaLogo} alt="" className="emma-logo emma-logo--avatar" sizes="72px" />
            </span>
            <div className="gb-ai-console-who">
              <strong>Emma</strong>
              <span>Four Sensations · en línea</span>
            </div>
          </div>

          <div
            ref={chatThreadRef}
            className="gb-ai-chat gb-ai-chat--thread"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((msg) => (
              <div key={msg.id} className={`gb-ai-msg gb-ai-msg--${msg.role}`}>
                {msg.role === "bot" && (
                  <span className="gb-ai-msg-avatar emma-msg-avatar" aria-hidden>
                    <Image src={emmaLogo} alt="" className="emma-logo emma-logo--msg" sizes="36px" />
                  </span>
                )}
                <div className="gb-ai-msg-body">
                  <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                  {quizStep === "done" && msg.productIds && msg.productIds.length > 0 && (
                    <JuliProductSlider
                      products={msg.productIds
                        .map((id) => productMap.get(id))
                        .filter((p): p is NonNullable<typeof p> => Boolean(p))}
                      hints={
                        msg.productHints
                          ? Object.fromEntries(
                              Object.entries(msg.productHints).map(([id, hint]) => {
                                const product = productMap.get(id);
                                const title = product ? getStorefrontProductTitle(product.name) : null;
                                return [id, hint || title?.subtitle || ""];
                              }),
                            )
                          : msg.productHints
                      }
                      favorites={favorites}
                      onOpen={openProductModal}
                      onAddCart={(id, product) => addToCart(id, product)}
                      onToggleFav={(id, isFav) => {
                        toggleFavorite(id);
                        showToast(
                          isFav ? "Quitado de favoritos" : "Guardado en favoritos",
                          "success",
                          isFav ? "♡" : "♥",
                        );
                      }}
                    />
                  )}
                  {(msg.actions?.length || msg.action) && (
                    <div className="gb-ai-msg-actions">
                      {msg.actions?.map((a, i) => renderAction(a, `a-${msg.id}-${i}`))}
                      {msg.action ? renderAction(msg.action, `a-${msg.id}-single`) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {quizStep === "loading" && (
              <div className="gb-ai-msg gb-ai-msg--bot">
                <span className="gb-ai-msg-avatar emma-msg-avatar" aria-hidden>
                  <Image src={emmaLogo} alt="" className="emma-logo emma-logo--msg" sizes="36px" />
                </span>
                <div className="gb-ai-msg-body emma-loading">
                  <div className="emma-loading__orbit" aria-hidden>
                    <span>💗</span>
                    <span>✨</span>
                    <span>💗</span>
                  </div>
                  <p>{EMMA_LOADING_TEXT}</p>
                </div>
              </div>
            )}
            {typing && (
              <div className="gb-ai-msg gb-ai-msg--bot gb-ai-msg--typing">
                <span className="gb-ai-msg-avatar emma-msg-avatar" aria-hidden>
                  <Image src={emmaLogo} alt="" className="emma-logo emma-logo--msg" sizes="36px" />
                </span>
                <div className="gb-ai-msg-body">
                  <span className="gb-ai-typing-bubble" aria-label="Escribiendo">
                    <span /><span /><span />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="gb-ai-chips">
            {quizStep === "intro" ? (
              <button type="button" className="gb-ai-chip gb-ai-chip--primary" onClick={startQuiz}>
                {EMMA_START_LABEL}
              </button>
            ) : null}

            {currentQuestion?.multiple
              ? currentQuestion.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`gb-ai-chip${pendingMulti.includes(opt.id) ? " is-selected" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleMultiOption(currentQuestion, opt.id)}
                  >
                    {opt.emoji ? `${opt.emoji} ` : ""}
                    {opt.label}
                    {opt.hint ? <small className="gb-ai-chip__hint">{opt.hint}</small> : null}
                  </button>
                ))
              : currentQuestion
                ? currentQuestion.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="gb-ai-chip"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSingleOption(currentQuestion, opt.id)}
                    >
                      {opt.label}
                      {opt.hint ? <small className="gb-ai-chip__hint">{opt.hint}</small> : null}
                    </button>
                  ))
                : null}

            {currentQuestion?.multiple ? (
              <button
                type="button"
                className="gb-ai-chip gb-ai-chip--primary"
                disabled={pendingMulti.length === 0}
                onClick={() => confirmMulti(currentQuestion)}
              >
                {EMMA_CONTINUE_LABEL}
              </button>
            ) : null}

            {quizStep === "done" ? (
              <button type="button" className="gb-ai-chip" onClick={restartQuiz}>
                Empezar de nuevo 💗
              </button>
            ) : null}
          </div>

          {quizStep === "done" ? (
            <form
              className="gb-ai-composer"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <label htmlFor={inputId} className="sr-only">
                Escribe a Emma
              </label>
              <input
                id={inputId}
                type="text"
                className="gb-ai-input"
                placeholder="¿Quieres afinar un paso de tu rutina?"
                value={draft}
                disabled={typing}
                onChange={(e) => setDraft(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="gb-ai-send" disabled={typing || !draft.trim()} aria-label="Enviar">
                ↑
              </button>
            </form>
          ) : (
            <p className="emma-quiz-hint">Emma te escucha primero. Los productos aparecen al final ✨</p>
          )}
        </MotionDiv>
      </div>
    </section>
  );
}
