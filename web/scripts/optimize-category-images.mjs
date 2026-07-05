import fs from "fs";
import path from "path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "categorias");

/** Tarjetas verticales ~4:5 como la referencia; fuente cuadrada recortada al centro. */
const OUT_WIDTH = 420;
const OUT_HEIGHT = 520;
const WEBP_QUALITY = 82;

const jobs = [
  { src: "cuidado-capilar.png", out: "cuidado-capilar-rosado.webp", variant: "rosado" },
  { src: "cuidado-piel-cafe.png", out: "cuidado-piel-cafe.webp", variant: "cafe" },
  { src: "maquillaje.png", out: "maquillaje-rosado.webp", variant: "rosado" },
  { src: "hombres.png", out: "hombres-cafe.webp", variant: "cafe" },
  { src: "tintes.png", out: "tintes-rosado.webp", variant: "rosado" },
  { src: "unas.png", out: "unas-cafe.webp", variant: "cafe" },
];

for (const job of jobs) {
  const input = path.join(DIR, job.src);
  const output = path.join(DIR, job.out);
  if (!fs.existsSync(input)) {
    console.warn(`Skip (missing): ${job.src}`);
    continue;
  }
  const meta = await sharp(input).metadata();
  await sharp(input)
    .resize(OUT_WIDTH, OUT_HEIGHT, { fit: "cover", position: "centre" })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(output);
  const outStat = fs.statSync(output);
  console.log(
    `${job.src} (${meta.width}x${meta.height}) → ${job.out} (${OUT_WIDTH}x${OUT_HEIGHT}, ${Math.round(outStat.size / 1024)}KB, ${job.variant})`,
  );
}

console.log("Done.");
