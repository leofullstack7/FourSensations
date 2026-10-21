/**
 * Exporta StoredImage (BYTEA) → public/media/stored/{id}.webp
 * Una imagen a la vez (evitar OOM al traer todos los BYTEA juntos).
 */
import { config as loadEnv } from "dotenv";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const MAX_WIDTH = 800;
const WEBP_QUALITY = 72;
const MAX_SOURCE_BYTES = 4_000_000;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("[publish-stored-media] Sin DATABASE_URL; se omite.");
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const destRoot = join(process.cwd(), "public", "media", "stored");

  try {
    if (existsSync(destRoot)) {
      rmSync(destRoot, { recursive: true, force: true });
    }
    mkdirSync(destRoot, { recursive: true });

    const ids = await prisma.$queryRaw`
      SELECT id
      FROM "StoredImage"
      WHERE octet_length(bytes) > 0 AND octet_length(bytes) <= ${MAX_SOURCE_BYTES}
      ORDER BY "createdAt" DESC
    `;

    let ok = 0;
    let skip = 0;
    let bytesOut = 0;

    for (const row of ids) {
      const id = String(row.id);
      const full = await prisma.storedImage.findUnique({
        where: { id },
        select: { bytes: true },
      });
      if (!full?.bytes) {
        skip += 1;
        continue;
      }
      const buf = Buffer.from(full.bytes);
      const outPath = join(destRoot, `${id}.webp`);
      try {
        await sharp(buf)
          .rotate()
          .resize({
            width: MAX_WIDTH,
            height: MAX_WIDTH * 2,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: WEBP_QUALITY, effort: 4 })
          .toFile(outPath);
        ok += 1;
        bytesOut += statSync(outPath).size;
        if (ok % 10 === 0) {
          console.log(`[publish-stored-media] ${ok}/${ids.length}…`);
        }
      } catch (e) {
        skip += 1;
        console.warn("[publish-stored-media] skip", id, e?.message || e);
      }
    }

    console.log(
      `[publish-stored-media] ${ok} ok, ${skip} skip → public/media/stored (${(bytesOut / (1024 * 1024)).toFixed(1)} MB)`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[publish-stored-media]", err);
  process.exit(0);
});
