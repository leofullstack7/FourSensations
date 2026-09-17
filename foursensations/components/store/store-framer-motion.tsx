"use client";

/**
 * Framer Motion vía import dinámico en tienda pública: animaciones no críticas fuera del primer paint.
 */
import dynamic from "next/dynamic";

export const MotionSpan = dynamic(() => import("framer-motion").then((m) => m.motion.span), { ssr: false });
export const MotionButton = dynamic(() => import("framer-motion").then((m) => m.motion.button), { ssr: false });
export const MotionDiv = dynamic(() => import("framer-motion").then((m) => m.motion.div), { ssr: false });
