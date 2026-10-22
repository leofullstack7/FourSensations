"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { MotionDiv, MotionSpan } from "@/components/store/store-framer-motion";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { JuliProductSlider } from "@/components/store/JuliProductSlider";
import {
  EMMA_LEFT_COPY,
  buildEmmaRoutine,
  emmaReactionForAnswer,
  matchCatalogProductId,
  normalizeExclusiveSelection,
  questionsWithKnowledge,
  validateEmmaAnswers,
  type EmmaAnswers,
  type EmmaRoutineItem,
} from "@/lib/emma/flow";
import { buildWhyForMeLines } from "@/lib/emma/explanations";
import { defaultEmmaKnowledge, type EmmaKnowledgeBundle } from "@/lib/emma/knowledge";
import { buildAdvisorReply, type AdvisorHistoryTurn, type AiAdvisorReply } from "@/lib/ai-advisor";
import { ADVISOR_MAX_TURNS } from "@/lib/ai-advisor-context";
import type { StoreProduct } from "@/lib/types/product";
import emmaWordmark from "@/assets/foursensations/emma.png";

type Phase = "intro" | "question" | "loading" | "result" | "chat";

type ChatLine = {
  id: string;
  role: "bot" | "user";
  text: string;
  productIds?: string[];
};

function nid() {
  return `emma-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

function toHistory(lines: ChatLine[]): AdvisorHistoryTurn[] {
  return lines
    .filter((l) => l.id !== "intro")
    .map((l) => ({
      role: l.role,
      text: l.text,
      ...(l.productIds?.length ? { productIds: l.productIds } : {}),
    }))
    .slice(-ADVISOR_MAX_TURNS);
}

export function BeautyAiAdvisor() {
  const {
    catalogProducts,
    ensureFullCatalog,
    openProductModal,
    addToCart,
    toggleFavorite,
    favorites,
    showToast,
  } = useStorefrontUi();

  const [phase, setPhase] = useState<Phase>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Partial<EmmaAnswers>>({});
  const [lines, setLines] = useState<ChatLine[]>([
    { id: "intro", role: "bot", text: defaultEmmaKnowledge().intro },
  ]);
  const [resultIds, setResultIds] = useState<string[]>([]);
  const [resultReasons, setResultReasons] = useState<Record<string, string>>({});
  const [washChoice, setWashChoice] = useState<"base" | "alternative">("base");
  const [washOptions, setWashOptions] = useState<{
    baseKey: string;
    altKey: string | null;
    baseId: string | null;
    altId: string | null;
  } | null>(null);
  const [moduleIds, setModuleIds] = useState<string[]>([]);
  const [routineItems, setRoutineItems] = useState<EmmaRoutineItem[]>([]);
  const [mistIds, setMistIds] = useState<string[]>([]);
  const [kb, setKb] = useState<EmmaKnowledgeBundle>(() => defaultEmmaKnowledge());
  const questions = useMemo(() => questionsWithKnowledge(kb), [kb]);
  const introText = kb.intro;
  const startButton = kb.startButton;
  const loadingText = kb.loadingText;
  const mistKeys = kb.hairMistKeys;

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/store/emma/knowledge", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { published?: EmmaKnowledgeBundle };
        if (data.published) setKb(data.published);
      } catch {
        /* pack por defecto */
      }
    })();
  }, []);

  useEffect(() => {
    if (phase !== "intro") return;
    setLines((prev) => {
      if (prev.length === 1 && prev[0]?.id === "intro") {
        return [{ id: "intro", role: "bot", text: introText }];
      }
      return prev;
    });
  }, [introText, phase]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const catalogEnsured = useRef(false);
  const inputId = useId();

  useEffect(() => {
    if (catalogProducts.length > 0 || catalogEnsured.current) return;
    catalogEnsured.current = true;
    void ensureFullCatalog();
  }, [catalogProducts.length, ensureFullCatalog]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines, phase, selected, typing]);

  const question = questions[questionIndex];
  const productMap = useMemo(() => new Map(catalogProducts.map((p) => [p.id, p])), [catalogProducts]);
  const composerLocked = typing || phase === "loading";

  const toggleOption = useCallback(
    (id: string) => {
      if (!question) return;
      if (question.mode === "single") {
        setSelected([id]);
        return;
      }
      if (question.id === 2) {
        if (id === "natural") {
          setSelected(["natural"]);
          return;
        }
        setSelected((prev) => {
          const withoutNatural = prev.filter((x) => x !== "natural");
          return withoutNatural.includes(id) ? withoutNatural.filter((x) => x !== id) : [...withoutNatural, id];
        });
        return;
      }
      if (question.id === 4) {
        if (id === "ninguno") {
          setSelected(["ninguno"]);
          return;
        }
        setSelected((prev) => {
          const without = prev.filter((x) => x !== "ninguno");
          return without.includes(id) ? without.filter((x) => x !== id) : [...without, id];
        });
        return;
      }
      if (question.id === 6) {
        if (id === "ninguna") {
          setSelected(["ninguna"]);
          return;
        }
        setSelected((prev) => {
          const without = prev.filter((x) => x !== "ninguna");
          return without.includes(id) ? without.filter((x) => x !== id) : [...without, id];
        });
        return;
      }
      setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    },
    [question],
  );

  const startQuiz = useCallback(() => {
    setLines((prev) => [
      ...prev,
      { id: nid(), role: "user", text: startButton },
      { id: nid(), role: "bot", text: questions[0]!.prompt },
    ]);
    setPhase("question");
    setQuestionIndex(0);
    setSelected([]);
  }, [questions, startButton]);

  const finishAndRecommend = useCallback(
    (finalAnswers: EmmaAnswers) => {
      const valid = validateEmmaAnswers(finalAnswers);
      if (!valid) {
        showToast("Necesito completar las respuestas para armar tu rutina.", "danger", "⚠️");
        return;
      }
      setPhase("loading");
      setLines((prev) => [...prev, { id: nid(), role: "bot", text: loadingText }]);

      window.setTimeout(() => {
        const built = buildEmmaRoutine(valid, kb);
        const reasons: Record<string, string> = {};
        const resolve = (key: string) => matchCatalogProductId(catalogProducts, key);

        const baseId = resolve(built.baseWash.productKey);
        const altId = built.alternativeWash ? resolve(built.alternativeWash.productKey) : null;
        setWashOptions({
          baseKey: built.baseWash.productKey,
          altKey: built.alternativeWash?.productKey ?? null,
          baseId,
          altId,
        });
        setWashChoice("base");
        if (baseId) reasons[baseId] = built.baseWash.reason;
        if (altId && built.alternativeWash) {
          reasons[altId] = built.alternativeWash.reason;
        }

        const nextModules: string[] = [];
        for (const item of built.primary) {
          const id = resolve(item.productKey);
          if (id && id !== baseId && id !== altId) {
            nextModules.push(id);
            reasons[id] = item.reason;
          }
        }

        const washId = baseId;
        const ids = [...(washId ? [washId] : []), ...nextModules];

        const extras: string[] = [];
        for (const mistKey of mistKeys) {
          const id = resolve(mistKey);
          if (id && !ids.includes(id) && !extras.includes(id)) {
            extras.push(id);
            reasons[id] =
              built.extras[0]?.reason ??
              "Hair Mist opcional: un toque sensorial, no es tratamiento de caspa ni caída.";
            break; // un mist en la cerecita; el resto queda en catálogo
          }
        }

        const allItems: EmmaRoutineItem[] = [
          built.baseWash,
          ...(built.alternativeWash ? [built.alternativeWash] : []),
          ...built.primary,
          ...built.extras,
        ];
        setRoutineItems(allItems);
        setModuleIds(nextModules);
        setMistIds(extras);
        setResultIds(ids);
        setResultReasons(reasons);

        const washBlock = built.alternativeWash && altId
          ? {
              id: nid(),
              role: "bot" as const,
              text: `Tu primera recomendación de lavado: ${built.baseWash.productKey}. ${built.baseWash.reason} También puedes elegir ${built.alternativeWash.productKey} como alternativa — ¿con cuál de estos dos sistemas te quedas? Solo uno entra al carrito.`,
            }
          : {
              id: nid(),
              role: "bot" as const,
              text: `Tu primera recomendación de lavado: ${built.baseWash.productKey}. ${built.baseWash.reason}`,
            };

        setLines((prev) => [
          ...prev,
          { id: nid(), role: "bot", text: built.summary },
          washBlock,
          {
            id: nid(),
            role: "bot",
            text:
              nextModules.length > 0
                ? "Estos son los cuidados que sumé a tu rutina según tu prioridad y lo que me contaste:"
                : "Con tu base de lavado ya tienes el punto de partida. Si más adelante marcas más señales, puedo afinar tratamientos.",
            productIds: ids,
          },
          ...(extras.length
            ? [
                {
                  id: nid(),
                  role: "bot" as const,
                  text: "Y ahora la cerecita del helado 🍒💗: un Hair Mist Four Sensations para cerrar con ese toque que obsesiona. Un spray y todo cambia. (Opcional — no es tratamiento de caspa ni caída.)",
                  productIds: extras,
                },
              ]
            : []),
          {
            id: nid(),
            role: "bot",
            text: "¿Por qué para mí? · Cómo usarla · o lleva tu rutina al carrito 💗",
          },
        ]);
        setPhase("result");
      }, 1400);
    },
    [catalogProducts, showToast, kb, loadingText, mistKeys],
  );

  const confirmAnswer = useCallback(() => {
    if (!question || selected.length === 0) return;
    const chosen = normalizeExclusiveSelection(question.id, selected);
    const labels = question.options.filter((o) => chosen.includes(o.id)).map((o) => o.label);
    const reaction = emmaReactionForAnswer(question.id, chosen, kb);

    const nextAnswers: Partial<EmmaAnswers> = { ...answers };
    if (question.id === 1) nextAnswers.hairType = chosen[0];
    if (question.id === 2) nextAnswers.processes = chosen;
    if (question.id === 3) nextAnswers.feelings = chosen;
    if (question.id === 4) nextAnswers.scalp = chosen;
    if (question.id === 5) nextAnswers.priority = chosen[0];
    if (question.id === 6) nextAnswers.exposure = chosen;
    setAnswers(nextAnswers);

    setLines((prev) => [
      ...prev,
      { id: nid(), role: "user", text: labels.join(" · ") },
      { id: nid(), role: "bot", text: reaction },
    ]);

    const nextIndex = questionIndex + 1;
    if (nextIndex >= questions.length) {
      const finalAnswers: EmmaAnswers = {
        hairType: (nextAnswers.hairType as string) || "normal",
        processes: nextAnswers.processes || [],
        feelings: nextAnswers.feelings || [],
        scalp: nextAnswers.scalp || [],
        priority: (nextAnswers.priority as string) || "nutrir",
        exposure: nextAnswers.exposure || [],
      };
      finishAndRecommend(finalAnswers);
      return;
    }

    setQuestionIndex(nextIndex);
    setSelected([]);
    setLines((prev) => [...prev, { id: nid(), role: "bot", text: questions[nextIndex]!.prompt }]);
  }, [question, selected, answers, questionIndex, finishAndRecommend, kb, questions]);

  const sendFreeMessage = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || composerLocked) return;

      const userLine: ChatLine = { id: nid(), role: "user", text };
      let historyForApi: AdvisorHistoryTurn[] = [];

      setLines((prev) => {
        const next = [...prev, userLine].slice(-ADVISOR_MAX_TURNS);
        historyForApi = toHistory(next);
        return next;
      });
      setDraft("");
      setTyping(true);
      setPhase("chat");

      void (async () => {
        let reply: AiAdvisorReply | null = null;
        if (catalogProducts.length > 0) {
          reply = buildAdvisorReply(text, catalogProducts, {
            historyTurns: historyForApi,
            engine: "rules",
          });
        }
        if (!reply || !(reply.messages?.length)) {
          reply = await fetchAdvisorReply(text, historyForApi);
        }
        if (!reply) {
          reply = buildAdvisorReply(text, catalogProducts, {
            historyTurns: historyForApi,
            engine: "rules",
          });
        }
        const botLines: ChatLine[] = (reply?.messages || []).map((m) => ({
          id: nid(),
          role: "bot",
          text: m.text,
          productIds: m.productIds,
        }));
        if (!botLines.length) {
          botLines.push({
            id: nid(),
            role: "bot",
            text: "Cuéntame un poquito más de tu cabello y te ayudo con productos Four Sensations 💗",
          });
        }
        setLines((prev) => [...prev, ...botLines].slice(-ADVISOR_MAX_TURNS));
        setTyping(false);
      })();
    },
    [catalogProducts, composerLocked],
  );

  const applyWashChoice = useCallback(
    (choice: "base" | "alternative") => {
      if (!washOptions) return;
      setWashChoice(choice);
      const washId = choice === "alternative" ? washOptions.altId : washOptions.baseId;
      const next = [...(washId ? [washId] : []), ...moduleIds.filter((id) => id !== washOptions.baseId && id !== washOptions.altId)];
      setResultIds(next);
    },
    [washOptions, moduleIds],
  );

  const addRoutineToCart = useCallback(() => {
    // Solo lavado elegido + módulos (mist opcional no se fuerza)
    for (const id of resultIds) {
      const p = productMap.get(id);
      addToCart(id, p);
    }
    showToast(
      washOptions?.altId
        ? `Rutina al carrito con ${washChoice === "alternative" ? washOptions.altKey : washOptions.baseKey} 💗`
        : "Rutina agregada al carrito 💗",
      "success",
      "🛒",
    );
  }, [resultIds, productMap, addToCart, showToast, washOptions, washChoice]);

  const explainWhy = useCallback(() => {
    const linesWhy = buildWhyForMeLines(routineItems, undefined, kb);
    const text =
      linesWhy.map((w) => `• ${w.productKey}: ${w.text}`).join("\n") ||
      "Cada producto responde a lo que me contaste en el cuestionario 💗";
    setLines((prev) => [...prev, { id: nid(), role: "bot", text }]);
  }, [routineItems, kb]);

  const restart = useCallback(() => {
    setPhase("intro");
    setQuestionIndex(0);
    setSelected([]);
    setAnswers({});
    setResultIds([]);
    setResultReasons({});
    setWashOptions(null);
    setWashChoice("base");
    setModuleIds([]);
    setMistIds([]);
    setRoutineItems([]);
    setDraft("");
    setTyping(false);
    setLines([{ id: "intro", role: "bot", text: introText }]);
  }, [introText]);

  const goBackQuestion = useCallback(() => {
    if (phase !== "question" || questionIndex <= 0) return;
    const prev = questionIndex - 1;
    setQuestionIndex(prev);
    setSelected([]);
    setLines((prevLines) => [...prevLines, { id: nid(), role: "bot", text: questions[prev]!.prompt }]);
  }, [phase, questionIndex, questions]);

  const renderProducts = (ids: string[]) => {
    const products = ids.map((id) => productMap.get(id)).filter((p): p is StoreProduct => Boolean(p));
    if (!products.length) return null;
    return (
      <JuliProductSlider
        products={products}
        hints={Object.fromEntries(ids.map((id) => [id, resultReasons[id] || ""]))}
        favorites={favorites}
        onOpen={openProductModal}
        onAddCart={(id, product) => addToCart(id, product)}
        onToggleFav={(id, isFav) => {
          toggleFavorite(id);
          showToast(isFav ? "Quitado de favoritos" : "Guardado en favoritos", "success", isFav ? "♡" : "♥");
        }}
      />
    );
  };

  return (
    <section className="gb-ai-section section-pad juli-ai emma-ai" aria-labelledby="gb-ai-title">
      <div className="gb-ai-bg" aria-hidden>
        <div className="gb-ai-orb gb-ai-orb--1" />
        <div className="gb-ai-orb gb-ai-orb--2" />
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
            Emma · en vivo
          </MotionSpan>
          <h2 id="gb-ai-title" className="gb-ai-title">
            Hola, soy{" "}
            <Image src={emmaWordmark} alt="Emma" className="emma-wordmark" height={96} priority />
          </h2>
          <p className="gb-ai-kicker">{EMMA_LEFT_COPY.greeting}</p>
          <p className="gb-ai-desc">{EMMA_LEFT_COPY.body}</p>
          <ul className="gb-ai-features emma-hearts">
            {EMMA_LEFT_COPY.hearts.map((label) => (
              <li key={label} className="emma-heart-badge">
                <span className="emma-heart-badge__sparkle emma-heart-badge__sparkle--1" aria-hidden>
                  ✦
                </span>
                <span className="emma-heart-badge__sparkle emma-heart-badge__sparkle--2" aria-hidden>
                  ✧
                </span>
                <span className="emma-heart-badge__sparkle emma-heart-badge__sparkle--3" aria-hidden>
                  ✦
                </span>
                <svg className="emma-heart-badge__shape" viewBox="0 0 120 110" aria-hidden>
                  <path
                    className="emma-heart-badge__path"
                    d="M60 102 C22 74 6 50 16 30 C24 14 44 12 60 30 C76 12 96 14 104 30 C114 50 98 74 60 102 Z"
                  />
                </svg>
                <span className="emma-heart-badge__label">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <MotionDiv
          className="gb-ai-console gb-ai-console--chat"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          <div className="gb-ai-console-header">
            <span className="gb-ai-avatar-mark" aria-hidden>
              💗
            </span>
            <div className="gb-ai-console-who">
              <strong className="emma-console-name">
                <Image src={emmaWordmark} alt="Emma" className="emma-wordmark emma-wordmark--console" height={36} />
              </strong>
              <span>Four Sensations · en línea</span>
            </div>
          </div>

          <div ref={threadRef} className="gb-ai-chat gb-ai-chat--thread" role="log" aria-live="polite">
            {lines.map((msg) => (
              <div key={msg.id} className={`gb-ai-msg gb-ai-msg--${msg.role}`}>
                {msg.role === "bot" && (
                  <span className="gb-ai-msg-avatar" aria-hidden>
                    💗
                  </span>
                )}
                <div className="gb-ai-msg-body">
                  <p>{msg.text}</p>
                  {msg.productIds?.length ? renderProducts(msg.productIds) : null}
                </div>
              </div>
            ))}
            {typing || phase === "loading" ? (
              <div className="gb-ai-msg gb-ai-msg--bot gb-ai-msg--typing emma-loading">
                <span className="gb-ai-msg-avatar" aria-hidden>
                  💗
                </span>
                <div className="gb-ai-msg-body">
                  <div className="emma-hearts-loader" aria-label="Emma está escribiendo">
                    <span>💗</span>
                    <span>💖</span>
                    <span>💗</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="emma-console-footer">
            {phase === "intro" ? (
              <div className="gb-ai-chips">
                <button type="button" className="gb-ai-chip gb-ai-chip--primary" onClick={startQuiz}>
                  {startButton}
                </button>
              </div>
            ) : null}

            {phase === "question" && question ? (
              <div className="emma-quiz">
                <p className="emma-progress" style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)" }}>
                  Pregunta {questionIndex + 1} de {questions.length}
                </p>
                <div className="gb-ai-chips emma-options">
                  {question.options.map((opt) => {
                    const active = selected.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`gb-ai-chip${active ? " is-active" : ""}`}
                        onClick={() => toggleOption(opt.id)}
                      >
                        {opt.label}
                        {opt.hint ? <small className="emma-option-hint">{opt.hint}</small> : null}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {questionIndex > 0 ? (
                    <button type="button" className="btn btn-outline emma-continue" onClick={goBackQuestion}>
                      ← Atrás
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-primary emma-continue"
                    disabled={selected.length === 0}
                    onClick={confirmAnswer}
                  >
                    Continuar 💗
                  </button>
                </div>
              </div>
            ) : null}

            {phase === "result" ? (
              <div className="gb-ai-chips emma-result-actions">
                {washOptions?.altId ? (
                  <>
                    <p style={{ width: "100%", margin: "0 0 4px", fontSize: 12, fontWeight: 600 }}>
                      ¿Con cuál sistema de lavado te quedas?
                    </p>
                    <button
                      type="button"
                      className={`gb-ai-chip${washChoice === "base" ? " is-active" : ""}`}
                      onClick={() => applyWashChoice("base")}
                    >
                      {washOptions.baseKey} (recomendada)
                    </button>
                    <button
                      type="button"
                      className={`gb-ai-chip${washChoice === "alternative" ? " is-active" : ""}`}
                      onClick={() => applyWashChoice("alternative")}
                    >
                      Alternativa: {washOptions.altKey}
                    </button>
                  </>
                ) : null}
                <button type="button" className="gb-ai-chip gb-ai-chip--primary" onClick={addRoutineToCart}>
                  ¡Lleva tu rutina a casa! 💗
                </button>
                {mistIds.length > 0 ? (
                  <button
                    type="button"
                    className="gb-ai-chip"
                    onClick={() => {
                      for (const id of mistIds) {
                        const p = productMap.get(id);
                        addToCart(id, p);
                      }
                      showToast("Hair Mist agregado (opcional) 💗", "success", "🍒");
                    }}
                  >
                    Sumar Hair Mist al carrito
                  </button>
                ) : null}
                <button type="button" className="gb-ai-chip" onClick={explainWhy}>
                  ¿Por qué para mí?
                </button>
                <button type="button" className="gb-ai-chip" onClick={restart}>
                  Empezar de nuevo
                </button>
              </div>
            ) : null}

            {phase === "chat" ? (
              <div className="gb-ai-chips emma-result-actions">
                <button type="button" className="gb-ai-chip" onClick={restart}>
                  Empezar de nuevo
                </button>
                <button type="button" className="gb-ai-chip gb-ai-chip--primary" onClick={startQuiz}>
                  Hacer el cuestionario 💗
                </button>
              </div>
            ) : null}

            <form
              className="gb-ai-composer"
              onSubmit={(e) => {
                e.preventDefault();
                sendFreeMessage(draft);
              }}
            >
              <label htmlFor={inputId} className="sr-only">
                Escribe a Emma
              </label>
              <input
                id={inputId}
                type="text"
                className="gb-ai-input"
                placeholder="Ej. tengo frizz y las puntas muy secas…"
                value={draft}
                disabled={composerLocked}
                onChange={(e) => setDraft(e.target.value)}
                autoComplete="off"
              />
              <button
                type="submit"
                className="gb-ai-send"
                disabled={composerLocked || !draft.trim()}
                aria-label="Enviar"
              >
                ↑
              </button>
            </form>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}
