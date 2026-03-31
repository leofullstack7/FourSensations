import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "../lib/slugify";
import { defaultMenuConfig } from "../lib/menu-config";

// Prisma CLI solo carga `.env`; Next usa `.env.local` — cargamos ambos (local gana).
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

/**
 * Neon pooler + transacciones interactivas largas → P2028 "Transaction not found".
 * El seed prefiere DIRECT_URL (conexión directa). Sin ella, usa DATABASE_URL (p. ej. Postgres local).
 */
const seedDatabaseUrl =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!seedDatabaseUrl) {
  throw new Error("Falta DATABASE_URL (y opcionalmente DIRECT_URL) para el seed.");
}

const prisma = new PrismaClient({
  datasources: { db: { url: seedDatabaseUrl } },
});

const siteMenuData: Prisma.InputJsonValue = {
  Maquillaje: {
    icon: "💄",
    subs: {
      Labios: ["Labial líquido", "Gloss", "Perfiladores"],
      Ojos: ["Sombras", "Delineador", "Máscara"],
      Rostro: ["Base", "Rubor", "Iluminador"],
    },
  },
  "Cuidado piel": {
    icon: "🌿",
    subs: {
      Rutina: ["Limpiador", "Tónico", "Sérum"],
      Hidratación: ["Cremas", "Geles", "Mists"],
      Tratamiento: ["Manchas", "Poros", "Mascarillas"],
    },
  },
  "Cuidado capilar": {
    icon: "💇",
    subs: {
      Limpieza: ["Shampoo", "Co-wash"],
      Tratamiento: ["Reparación", "Hidratación", "Anticaspa"],
      Estilo: ["Finalizadores", "Aceites"],
    },
  },
  Uñas: {
    icon: "💅",
    subs: {
      Color: ["Esmaltes", "Top coat"],
      Cuidado: ["Fortalecedor", "Cutículas"],
      Herramientas: ["Limas", "Palitos"],
    },
  },
  Hombres: {
    icon: "🧔",
    subs: {
      Piel: ["Limpiador facial", "Hidratante"],
      Barba: ["Aceite", "Bálsamo", "Cera"],
      Kits: ["Rutina express", "Regalo"],
    },
  },
};

const siteSettingsData: Prisma.InputJsonValue = {
  topbar: "Envío gratis en compras superiores a $100.000 · Productos cruelty-free seleccionados",
  hero: {
    eyebrow: "Nueva temporada · GinnaBeauty",
    titleBefore: "Belleza que",
    titleAccent: "te abraza",
    subtitle:
      "Cosmética premium con tonos suaves, fórmulas conscientes y resultados de estudio. Descubre maquillaje, piel y cabello en un solo lugar.",
    primaryCta: { label: "Ver productos", href: "#productos" },
    secondaryCta: { label: "Nuestra filosofía", href: "#confianza" },
    stats: [
      { value: "+12k", label: "clientas felices" },
      { value: "4.9", label: "valoración media" },
      { value: "48h", label: "envío express" },
    ],
  },
  marquee: "Piel radiante · Labios perfectos · Cabello sedoso · Uñas impecables · Ritual de bienestar",
  trustStrip: {
    title: "Por qué elegirnos",
    items: [
      { icon: "🌸", title: "Fórmulas suaves", text: "Seleccionamos ingredientes de alta calidad." },
      { icon: "✨", title: "Resultados reales", text: "Looks de estudio que puedes llevar cada día." },
      { icon: "🌿", title: "Rituales conscientes", text: "Menos pasos, más impacto en tu rutina." },
      { icon: "💌", title: "Asesoría cercana", text: "Te ayudamos a armar tu kit ideal." },
    ],
  },
  newsletter: {
    title: "Únete al club GinnaBeauty",
    subtitle: "Lanzamientos, tips de maquillaje y promociones solo para suscriptoras.",
    placeholder: "Tu correo electrónico",
    buttonLabel: "Quiero recibir novedades",
    disclaimer: "Sin spam. Puedes darte de baja cuando quieras.",
  },
  footer: {
    tagline: "GinnaBeauty — cosmética con alma femenina y estándar premium.",
    contactHint: "Escríbenos por WhatsApp o Instagram para pedidos y asesoría.",
  },
  seo: {
    defaultTitle: "GinnaBeauty | Cosmética y cuidado premium",
    defaultDescription:
      "Tienda de cosméticos: maquillaje, cuidado de piel, capilar, uñas y línea hombres. Envíos a Colombia.",
  },
};

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim() || "admin@ginnabeauty.local";
  const plainPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!plainPassword || plainPassword.length < 8) {
    throw new Error(
      "Define SEED_ADMIN_PASSWORD en .env.local (mínimo 8 caracteres) antes de ejecutar el seed."
    );
  }

  const passwordHash = await bcrypt.hash(plainPassword, 12);

  type SubSeed = { slug: string; name: string; menuTag: string | null; sortOrder: number };

  const categoriesSeed: { slug: string; name: string; icon: string; sortOrder: number; subs: SubSeed[] }[] = [];
  let catOrder = 0;
  for (const [catName, cfg] of Object.entries(defaultMenuConfig)) {
    const slug = slugify(catName);
    let subOrder = 0;
    const subs: SubSeed[] = [];
    for (const [menuTag, names] of Object.entries(cfg.subs)) {
      for (const name of names) {
        subs.push({
          slug: slugify(`${menuTag}-${name}`),
          name,
          menuTag,
          sortOrder: subOrder++,
        });
      }
    }
    categoriesSeed.push({
      slug,
      name: catName,
      icon: cfg.icon,
      sortOrder: catOrder++,
      subs,
    });
  }

  const productsSeed = [
    {
      name: "Labial Velvet Nude",
      category: "maquillaje",
      subcategory: "Labial",
      description:
        "Labial líquido de larga duración con acabado aterciopelado. No reseca y deja un nude rosado favorecedor.",
      price: 28_900,
      originalPrice: 36_000,
      stock: 24,
      rating: 4.8,
      reviews: 124,
      badge: "best",
      emoji: "💄",
      isNew: false,
    },
    {
      name: "Gloss Crystal Pink",
      category: "maquillaje",
      subcategory: "Labios",
      description: "Gloss transparente con destellos rosados y sensación de volumen sin pegajosidad.",
      price: 22_000,
      originalPrice: null,
      stock: 40,
      rating: 4.6,
      reviews: 87,
      badge: "new",
      emoji: "🍬",
      isNew: true,
    },
    {
      name: "Delineador Precision Ink",
      category: "maquillaje",
      subcategory: "Delineador",
      description: "Delineador de punta extra fina, resistente al agua y al calor. Negro intenso.",
      price: 19_500,
      originalPrice: 25_000,
      stock: 55,
      rating: 4.9,
      reviews: 203,
      badge: "hot",
      emoji: "👁️",
      isNew: false,
    },
    {
      name: "Paleta Sombras Bloom",
      category: "maquillaje",
      subcategory: "Sombras",
      description: "Doce tonos mate y satinados en familia rosa y malva. Pigmentación alta y difuminado fácil.",
      price: 65_000,
      originalPrice: 82_000,
      stock: 12,
      rating: 4.7,
      reviews: 156,
      badge: "sale",
      emoji: "🎨",
      isNew: false,
    },
    {
      name: "Sérum Vitamina C Glow",
      category: "cuidado-piel",
      subcategory: "Sérum",
      description: "Sérum 15% vitamina C estabilizada con ácido hialurónico. Ilumina y unifica el tono.",
      price: 92_000,
      originalPrice: 115_000,
      stock: 18,
      rating: 4.9,
      reviews: 234,
      badge: "best",
      emoji: "🍊",
      isNew: false,
    },
    {
      name: "Crema Hidratante Calm Rose",
      category: "cuidado-piel",
      subcategory: "Hidratante",
      description: "Textura gel-crema con niacinamida y extracto de rosa mosqueta. Ideal para piel mixta.",
      price: 54_000,
      originalPrice: null,
      stock: 30,
      rating: 4.5,
      reviews: 98,
      badge: null,
      emoji: "🌸",
      isNew: true,
    },
    {
      name: "Mascarilla Arcilla Rosa Detox",
      category: "cuidado-piel",
      subcategory: "Mascarillas",
      description: "Arcilla rosa suave que purifica sin tirantez. 10 minutos una o dos veces por semana.",
      price: 45_000,
      originalPrice: null,
      stock: 22,
      rating: 4.4,
      reviews: 67,
      badge: "new",
      emoji: "🧖‍♀️",
      isNew: false,
    },
    {
      name: "Shampoo Reparación Keratin",
      category: "cuidado-capilar",
      subcategory: "Reparación",
      description: "Limpieza suave con queratina vegetal y ceramidas. Para cabello teñido o con calor frecuente.",
      price: 38_500,
      originalPrice: null,
      stock: 45,
      rating: 4.6,
      reviews: 142,
      badge: null,
      emoji: "🌿",
      isNew: false,
    },
    {
      name: "Acondicionador Hidra Silk",
      category: "cuidado-capilar",
      subcategory: "Hidratación",
      description: "Desenreda al instante y sella puntas. Notas florales ligeras, sin siliconas pesadas.",
      price: 38_500,
      originalPrice: null,
      stock: 38,
      rating: 4.5,
      reviews: 111,
      badge: null,
      emoji: "✨",
      isNew: false,
    },
    {
      name: "Esmalte Gel Shine Cherry",
      category: "unas",
      subcategory: "Esmaltes",
      description: "Color cereza profundo con brillo tipo gel. Secado rápido y buena duración en uña natural.",
      price: 18_000,
      originalPrice: null,
      stock: 60,
      rating: 4.5,
      reviews: 73,
      badge: "new",
      emoji: "💅",
      isNew: true,
    },
    {
      name: "Kit Barba & Piel Daily",
      category: "hombres",
      subcategory: "Kit básico",
      description: "Limpiador facial + hidratante ligero + aceite de barba en formato viaje. Presentación regalo.",
      price: 72_000,
      originalPrice: 89_000,
      stock: 15,
      rating: 4.7,
      reviews: 52,
      badge: null,
      emoji: "🧴",
      isNew: false,
    },
    {
      name: "Protector solar fluido SPF 50",
      category: "cuidado-piel",
      subcategory: "Hidratante",
      description: "Toque seco, sin efecto blanco. Protección UVA/UVB amplia espectro para uso diario bajo maquillaje.",
      price: 48_000,
      originalPrice: null,
      stock: 50,
      rating: 4.8,
      reviews: 189,
      badge: "hot",
      emoji: "☀️",
      isNew: false,
    },
  ] as const;

  // Sin $transaction larga: el pooler de Neon puede perder el contexto (P2028).
  // Orden respetando FKs; mismo resultado idempotente al re-ejecutar.
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.subcategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.siteMenu.deleteMany();

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Administradora GinnaBeauty",
      role: "ADMIN",
      passwordHash,
    },
    update: {
      name: "Administradora GinnaBeauty",
      role: "ADMIN",
      passwordHash,
    },
  });

  for (const c of categoriesSeed) {
    await prisma.category.create({
      data: {
        slug: c.slug,
        name: c.name,
        icon: c.icon,
        sortOrder: c.sortOrder,
        subcategories: {
          create: c.subs.map((s) => ({
            slug: s.slug,
            name: s.name,
            menuTag: s.menuTag,
            sortOrder: s.sortOrder,
          })),
        },
      },
    });
  }

  await prisma.product.createMany({
    data: productsSeed.map((p) => ({
      slug: slugify(p.name),
      name: p.name,
      brand: "GinnaBeauty",
      category: p.category,
      subcategory: p.subcategory,
      description: p.description,
      price: p.price,
      originalPrice: p.originalPrice,
      stock: p.stock,
      rating: p.rating,
      reviews: p.reviews,
      badge: p.badge,
      emoji: p.emoji,
      isNew: p.isNew,
      active: true,
    })),
  });

  await prisma.siteMenu.create({
    data: { data: siteMenuData },
  });

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, data: siteSettingsData },
    update: { data: siteSettingsData },
  });

  console.log("Seed completado.");
  console.log(`  Admin: ${email} (rol ADMIN, contraseña desde SEED_ADMIN_PASSWORD)`);
  console.log(`  Categorías: ${categoriesSeed.length}`);
  console.log(
    `  Subcategorías: ${categoriesSeed.reduce((n, c) => n + c.subs.length, 0)}`
  );
  console.log(`  Productos: ${productsSeed.length}`);
  console.log("  SiteMenu: 1 fila (mega menú JSON)");
  console.log("  SiteSettings: id=1 (hero y textos JSON)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
