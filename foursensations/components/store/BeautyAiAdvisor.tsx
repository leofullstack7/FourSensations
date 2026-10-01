"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MotionDiv, MotionSpan } from "@/components/store/store-framer-motion";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { JuliProductSlider } from "@/components/store/JuliProductSlider";
import {
  EMMA_INTRO,
  EMMA_LEFT_COPY,
  EMMA_QUESTIONS,
  EMMA_START_BUTTON,
  buildEmmaRoutine,
  emmaReactionForAnswer,
  matchCatalogProductId,
  type EmmaAnswers,
} from "@/lib/emma/flow";
import type { StoreProduct } from "@/lib/types/product";

type Phase = "intro" | "question" | "loading" | "result";

type ChatLine = {
  id: string;
  role: "bot" | "user";
  text: string;
  productIds?: string[];
};

function nid() {
  return `emma-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
  const [lines, setLines] = useState<ChatLine[]>([{ id: "intro", role: "bot", text: EMMA_INTRO }]);
  const [resultIds, setResultIds] = useState<string[]>([]);
  const [resultReasons, setResultReasons] = useState<Record<string, string>>({});
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);
  const catalogEnsured = useRef(false);

  useEffect(() => {
    if (catalogProducts.length > 0 || catalogEnsured.current) return;
    catalogEnsured.current = true;
    void ensureFullCatalog();
  }, [catalogProducts.length, ensureFullCatalog]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines, phase, selected]);

  const question = EMMA_QUESTIONS[questionIndex];
  const productMap = useMemo(() => new Map(catalogProducts.map((p) => [p.id, p])), [catalogProducts]);

  const toggleOption = useCallback(
    (id: string) => {
      if (!question) return;
      if (question.mode === "single") {
        setSelected([id]);
        return;
      }
      // multi rules
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
      { id: nid(), role: "user", text: EMMA_START_BUTTON },
      { id: nid(), role: "bot", text: EMMA_QUESTIONS[0]!.prompt },
    ]);
    setPhase("question");
    setQuestionIndex(0);
    setSelected([]);
  }, []);

  const finishAndRecommend = useCallback(
    (finalAnswers: EmmaAnswers) => {
      setPhase("loading");
      setLines((prev) => [...prev, { id: nid(), role: "bot", text: "🪄Emma está armando tu rutina✨" }]);

      window.setTimeout(() => {
        const built = buildEmmaRoutine(finalAnswers);
        const ids: string[] = [];
        const reasons: Record<string, string> = {};
        for (const item of built.primary) {
          const id = matchCatalogProductId(catalogProducts, item.productKey);
          if (id) {
            ids.push(id);
            reasons[id] = `${item.step}: ${item.reason}`;
          }
        }
        const extras: string[] = [];
        for (const item of built.extras) {
          const id = matchCatalogProductId(catalogProducts, item.productKey);
          if (id && !ids.includes(id)) {
            extras.push(id);
            reasons[id] = `${item.step}: ${item.reason}`;
          }
        }
        setResultIds(ids);
        setExtraIds(extras);
        setResultReasons(reasons);
        setLines((prev) => [
          ...prev,
          { id: nid(), role: "bot", text: built.summary, productIds: ids },
          ...(extras.length
            ? [
                {
                  id: nid(),
                  role: "bot" as const,
                  text: "Y ahora la cerecita del helado 🍒💗: un Hair Mist Four Sensations para cerrar con ese toque que obsesiona. Un spray y todo cambia ✨",
                  productIds: extras,
                },
              ]
            : []),
          {
            id: nid(),
            role: "bot",
            text: "Si quieres, te explico por qué elegí cada uno o agregamos la rutina al carrito 💗",
          },
        ]);
        setPhase("result");
      }, 1600);
    },
    [catalogProducts],
  );

  const confirmAnswer = useCallback(() => {
    if (!question || selected.length === 0) return;
    const labels = question.options.filter((o) => selected.includes(o.id)).map((o) => o.label);
    const reaction = emmaReactionForAnswer(question.id, selected);

    const nextAnswers: Partial<EmmaAnswers> = { ...answers };
    if (question.id === 1) nextAnswers.hairType = selected[0];
    if (question.id === 2) nextAnswers.processes = selected;
    if (question.id === 3) nextAnswers.feelings = selected;
    if (question.id === 4) nextAnswers.scalp = selected;
    if (question.id === 5) nextAnswers.priority = selected[0];
    if (question.id === 6) nextAnswers.exposure = selected;
    setAnswers(nextAnswers);

    setLines((prev) => [
      ...prev,
      { id: nid(), role: "user", text: labels.join(" · ") },
      { id: nid(), role: "bot", text: reaction },
    ]);

    const nextIndex = questionIndex + 1;
    if (nextIndex >= EMMA_QUESTIONS.length) {
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
    setLines((prev) => [...prev, { id: nid(), role: "bot", text: EMMA_QUESTIONS[nextIndex]!.prompt }]);
  }, [question, selected, answers, questionIndex, finishAndRecommend]);

  const addRoutineToCart = useCallback(() => {
    for (const id of resultIds) {
      const p = productMap.get(id);
      addToCart(id, p);
    }
    showToast("Rutina agregada al carrito 💗", "success", "🛒");
  }, [resultIds, productMap, addToCart, showToast]);

  const restart = useCallback(() => {
    setPhase("intro");
    setQuestionIndex(0);
    setSelected([]);
    setAnswers({});
    setResultIds([]);
    setExtraIds([]);
    setResultReasons({});
    setLines([{ id: "intro", role: "bot", text: EMMA_INTRO }]);
  }, []);

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
            Emma · en vivo
          </MotionSpan>
          <h2 id="gb-ai-title" className="gb-ai-title">
            Hola, soy <em>Emma</em>
          </h2>
          <p className="gb-ai-kicker">{EMMA_LEFT_COPY.greeting}</p>
          <p className="gb-ai-desc">{EMMA_LEFT_COPY.body}</p>
          <ul className="gb-ai-features emma-hearts">
            {EMMA_LEFT_COPY.hearts.map((label) => (
              <li key={label}>
                <span aria-hidden>💗</span> {label}
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
              <strong>Emma</strong>
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
            {phase === "loading" ? (
              <div className="gb-ai-msg gb-ai-msg--bot gb-ai-msg--typing emma-loading">
                <span className="gb-ai-msg-avatar" aria-hidden>
                  💗
                </span>
                <div className="gb-ai-msg-body">
                  <div className="emma-hearts-loader" aria-label="Emma está armando tu rutina">
                    <span>💗</span>
                    <span>💖</span>
                    <span>💗</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {phase === "intro" ? (
            <div className="gb-ai-chips">
              <button type="button" className="gb-ai-chip gb-ai-chip--primary" onClick={startQuiz}>
                {EMMA_START_BUTTON}
              </button>
            </div>
          ) : null}

          {phase === "question" && question ? (
            <div className="emma-quiz">
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
              <button
                type="button"
                className="btn btn-primary emma-continue"
                disabled={selected.length === 0}
                onClick={confirmAnswer}
              >
                Continuar 💗
              </button>
            </div>
          ) : null}

          {phase === "result" ? (
            <div className="gb-ai-chips emma-result-actions">
              <button type="button" className="gb-ai-chip gb-ai-chip--primary" onClick={addRoutineToCart}>
                Agregar mi rutina al carrito 💗
              </button>
              <button
                type="button"
                className="gb-ai-chip"
                onClick={() =>
                  setLines((prev) => [
                    ...prev,
                    {
                      id: nid(),
                      role: "bot",
                      text:
                        resultIds
                          .map((id) => {
                            const p = productMap.get(id);
                            return p ? `• ${p.name}: ${resultReasons[id] || "Porque encaja con lo que me contaste."}` : "";
                          })
                          .filter(Boolean)
                          .join("\n") || "Cada producto responde a lo que me contaste en el cuestionario 💗",
                    },
                  ])
                }
              >
                ¿Por qué para mí?
              </button>
              <button type="button" className="gb-ai-chip" onClick={restart}>
                Empezar de nuevo
              </button>
            </div>
          ) : null}
        </MotionDiv>
      </div>
    </section>
  );
}
