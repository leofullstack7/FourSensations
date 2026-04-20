import "@/lib/load-env";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Singleton por proceso Node. En producción también debe vivir en `globalThis`:
 * si solo se asignaba en desarrollo, ciertos entornos (p. ej. Render con varios
 * workers o recarga de módulos) pueden acabar con más de un `PrismaClient`,
 * más conexiones de las necesarias y errores `Closed` cuando el PG/pooler cierra sockets idle.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;
