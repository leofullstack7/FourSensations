"use client";

import { useEffect } from "react";

const BRAND_TITLE = "Four Sensations";
const AWAY_TITLE = "VUELVE 🔥";

export function TabAwayTitle() {
  useEffect(() => {
    let lastVisibleTitle = document.title || BRAND_TITLE;
    let timer: number | undefined;
    let showAway = true;

    const stop = () => {
      if (timer != null) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };

    const startAway = () => {
      stop();
      showAway = true;
      document.title = AWAY_TITLE;
      timer = window.setInterval(() => {
        showAway = !showAway;
        document.title = showAway ? AWAY_TITLE : BRAND_TITLE;
      }, 1600);
    };

    const onVisibility = () => {
      if (document.hidden) {
        lastVisibleTitle = document.title.includes(AWAY_TITLE) ? lastVisibleTitle : document.title;
        startAway();
        return;
      }
      stop();
      document.title = lastVisibleTitle || BRAND_TITLE;
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
      if (document.hidden) return;
      document.title = lastVisibleTitle || BRAND_TITLE;
    };
  }, []);

  return null;
}
