import { useCallback, useRef, useState } from "react";

/**
 * Progreso 0→~93% mientras hay operación en curso; al llamar `finish()` pasa a 100% y se oculta.
 * Sirve para peticiones sin eventos de progreso reales (p. ej. import CSV).
 */
export function useBufferedProgress(cap = 93) {
  const [active, setActive] = useState(false);
  const [percent, setPercent] = useState(0);
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (ivRef.current != null) {
      clearInterval(ivRef.current);
      ivRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimer();
    setActive(true);
    setPercent(0);
    ivRef.current = setInterval(() => {
      setPercent((p) => {
        if (p >= cap) return p;
        const room = cap - p;
        return p + Math.max(0.35, room * 0.16);
      });
    }, 72);
  }, [cap, clearTimer]);

  const finish = useCallback(() => {
    clearTimer();
    setPercent(100);
    window.setTimeout(() => {
      setActive(false);
      setPercent(0);
    }, 480);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setActive(false);
    setPercent(0);
  }, [clearTimer]);

  return { active, percent, start, finish, reset };
}
