import "@/lib/load-env";
import { PrismaClient } from "@prisma/client";

/** Incrementar al cambiar `schema.prisma` para descartar clientes Prisma cacheados en dev. */
const PRISMA_CLIENT_GENERATION = "2026-07-28-catalog-versions";

type PrismaGlobal = {
  prisma?: PrismaClient;
  prismaGeneration?: string;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Singleton por proceso Node. En producción también debe vivir en `globalThis`:
 * si solo se asignaba en desarrollo, ciertos entornos (p. ej. Render con varios
 * workers o recarga de módulos) pueden acabar con más de un `PrismaClient`,
 * más conexiones de las necesarias y errores `Closed` cuando el PG/pooler cierra sockets idle.
 */
export const prisma =
  globalForPrisma.prismaGeneration === PRISMA_CLIENT_GENERATION && globalForPrisma.prisma
    ? globalForPrisma.prisma
    : createPrismaClient();

globalForPrisma.prisma = prisma;
globalForPrisma.prismaGeneration = PRISMA_CLIENT_GENERATION;
