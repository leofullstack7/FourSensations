"use client";

/**
 * Framer Motion vía import dinámico (ssr: false) para no inflar el bundle inicial de páginas legales.
 */
import dynamic from "next/dynamic";

export const MotionH1 = dynamic(() => import("framer-motion").then((m) => m.motion.h1), { ssr: false });
export const MotionP = dynamic(() => import("framer-motion").then((m) => m.motion.p), { ssr: false });
export const MotionDiv = dynamic(() => import("framer-motion").then((m) => m.motion.div), { ssr: false });
