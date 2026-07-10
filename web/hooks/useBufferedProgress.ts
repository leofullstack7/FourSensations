import { useCallback, useRef, useState } from "react";

export type BufferedProgressMode = "analyze" | "import" | "optimize" | "default";

const MODE_CONFIG: Record<BufferedProgressMode, { cap: number; estimatedMs: number }> = {
  analyze: { cap: 90, estimatedMs: 14_000 },
  import: { cap: 94, estimatedMs: 55_000 },
  optimize: { cap: 92, estimatedMs: 35_000 },
  default: { cap: 88, estimatedMs: 12_000 },
};

/**
 * Progreso simulado que avanza despacio hacia ~cap% mientras hay operación en curso;
 * al llamar `finish()` anima hasta 100% y se oculta.
 */
export function useBufferedProgress(defaultCap = 88) {
  const [active, setActive] = useState(false);
  const [percent, setPercent] = useState(0);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishIvRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);
  const modeRef = useRef<BufferedProgressMode>("default");

  const clearTickTimer = useCallback(() => {
    if (ivRef.current != null) {
      clearInterval(ivRef.current);
      ivRef.current = null;
    }
  }, []);

  const clearFinishAnim = useCallback(() => {
    if (finishIvRef.current != null) {
      clearInterval(finishIvRef.current);
      finishIvRef.current = null;
    }
    if (hideTimeoutRef.current != null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const start = useCallback(
    (mode: BufferedProgressMode = "default") => {
      clearTickTimer();
      clearFinishAnim();
      modeRef.current = mode;
      startedAtRef.current = Date.now();
      setActive(true);
      setPercent(0);

      const { cap, estimatedMs } = MODE_CONFIG[mode] ?? {
        cap: defaultCap,
        estimatedMs: MODE_CONFIG.default.estimatedMs,
      };

      ivRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        const timeBased = Math.min(cap, (elapsed / estimatedMs) * cap);
        setPercent((p) => {
          const asymptotic = p + Math.max(0.12, (cap - p) * 0.028);
          return Math.min(cap, Math.max(p, timeBased, asymptotic));
        });
      }, 130);
    },
    [clearTickTimer, clearFinishAnim, defaultCap]
  );

  const finish = useCallback(() => {
    clearTickTimer();
    clearFinishAnim();

    finishIvRef.current = setInterval(() => {
      setPercent((p) => {
        if (p >= 100) {
          if (finishIvRef.current != null) {
            clearInterval(finishIvRef.current);
            finishIvRef.current = null;
          }
          hideTimeoutRef.current = setTimeout(() => {
            setActive(false);
            setPercent(0);
            hideTimeoutRef.current = null;
          }, 720);
          return 100;
        }
        const room = 100 - p;
        return p + Math.max(0.35, room * 0.08);
      });
    }, 55);
  }, [clearTickTimer, clearFinishAnim]);

  const reset = useCallback(() => {
    clearTickTimer();
    clearFinishAnim();
    setActive(false);
    setPercent(0);
  }, [clearTickTimer, clearFinishAnim]);

  return { active, percent, start, finish, reset };
}
