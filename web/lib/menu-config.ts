import type { MenuConfig } from "@/lib/types/admin";

/** Igual que MENU_CONFIG en main.js — la tienda lo usa hasta leer menú desde API/DB. */
export const defaultMenuConfig: MenuConfig = {
  Accesorios: {
    icon: "👜",
    subs: { Capilar: ["Diademas", "Ligas", "Pinzas", "Peinillas"], Uñas: ["Limas", "Separadores", "Espatulas", "Brochas"], Otros: ["Bolsos", "Estuches", "Espejo de mano"] },
  },
  Mayorista: {
    icon: "📦",
    subs: { Paquetes: ["Kit Maquillaje", "Kit Capilar", "Kit Cuidado Piel"], Volumen: ["Pedidos mínimos 6 uds", "Pedidos mínimos 12 uds"], Exclusivo: ["Registrarme como mayorista"] },
  },
  "Cuidado capilar": {
    icon: "💇",
    subs: { Tratamiento: ["Reparación", "Hidratación", "Crecimiento"], Estilo: ["Finalizadores", "Voluminizadores", "Disciplinadores"], Especiales: ["Cura", "Sin sal", "Para teñido"] },
  },
  "Cuidado piel": {
    icon: "🌿",
    subs: { Rutina: ["Limpiador", "Tónico", "Sérum", "Hidratante"], Tratamiento: ["Manchas", "Acné", "Antienvejecimiento"], Especiales: ["Contorno ojos", "Exfoliante", "Mascarillas"] },
  },
  Maquillaje: {
    icon: "💄",
    subs: { Rostro: ["Base", "Corrector", "Rubor", "Bronzer"], Ojos: ["Sombras", "Delineador", "Máscara", "Cejas"], Labios: ["Labial", "Gloss", "Contorno labios"] },
  },
  Hombres: {
    icon: "🧔",
    subs: { Piel: ["Limpiador facial", "Hidratante", "Contorno ojos"], Barba: ["Aceite de barba", "Bálsamo", "Afeitado"], Kits: ["Kit básico", "Kit premium"] },
  },
  Uñas: {
    icon: "💅",
    subs: { Color: ["Esmaltes", "Gel UV", "Semipermanente"], Cuidado: ["Fortalecedor", "Cuticulas", "Aceites"], Herramientas: ["Limas", "Pulidores", "Kits completos"] },
  },
};
