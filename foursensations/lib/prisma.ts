import "@/lib/load-env";
import { PrismaClient } from "@prisma/client";

/** Incrementar al cambiar `schema.prisma` para descartar clientes Prisma cacheados en dev. */
const PRISMA_CLIENT_GENERATION = "2026-08-04-neon-reconnect";

type PrismaGlobal = {
  prisma?: PrismaClient;
  prismaGeneration?: string;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

/**
 * Neon (PgBouncer) cierra sockets idle → Prisma loguea `Error { kind: Closed }`.
 * Ajustamos timeouts en la URL pooled sin romper URLs que ya traen query params.
 */
function withNeonFriendlyParams(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "15");
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "30");
    // Neon pooler: evita prepared statements rotas tras reconnect.
    if (u.hostname.includes("-pooler.") || u.searchParams.get("pgbouncer") === "true") {
      if (!u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
    }
    return u.toString();
  } catch {
    return rawUrl;
  }
}

function createPrismaClient(): PrismaClient {
  const url = withNeonFriendlyParams(process.env.DATABASE_URL);
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

/**
 * Singleton por proceso Node. En producción también vive en `globalThis`
 * para no abrir varios pools (Render + Neon → `Closed` por exceso de conexiones idle).
 */
export const prisma =
  globalForPrisma.prismaGeneration === PRISMA_CLIENT_GENERATION && globalForPrisma.prisma
    ? globalForPrisma.prisma
    : createPrismaClient();

globalForPrisma.prisma = prisma;
globalForPrisma.prismaGeneration = PRISMA_CLIENT_GENERATION;

function isTransientPrismaConnectionError(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  if (code === "P1017" || code === "P1001" || code === "P1002" || code === "P1008") return true;
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("kind: Closed") ||
    msg.includes("Server has closed the connection") ||
    msg.includes("Can't reach database server") ||
    msg.includes("Connection reset") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT")
  );
}

/** Reintenta una vez tras reconectar si Neon/pooler cerró el socket. */
export async function withPrismaRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (attempt >= retries || !isTransientPrismaConnectionError(e)) throw e;
      console.warn("[prisma] Conexión caída; reconectando…", e instanceof Error ? e.message : e);
      try {
        await prisma.$disconnect();
      } catch {
        /* ignore */
      }
      await prisma.$connect();
    }
  }
  throw last;
}
