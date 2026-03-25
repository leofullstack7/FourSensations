import type { MenuConfig } from "@/lib/types/admin";

/** Menú demo hasta persistir `SiteMenu` vía API. */
export function getDefaultAdminMenu(): MenuConfig {
  return {
    Accesorios: { icon: "👜", subs: { Capilar: ["Diademas", "Ligas", "Pinzas"], Uñas: ["Limas", "Separadores"], Otros: ["Estuches", "Espejo"] } },
    Mayorista: { icon: "📦", subs: { Paquetes: ["Kit Maquillaje", "Kit Capilar"], Volumen: ["Pedidos x6", "Pedidos x12"] } },
    "Cuidado capilar": { icon: "💇", subs: { Tratamiento: ["Reparación", "Hidratación", "Crecimiento"], Estilo: ["Finalizadores", "Voluminizadores"] } },
    "Cuidado piel": { icon: "🌿", subs: { Rutina: ["Limpiador", "Tónico", "Sérum", "Hidratante"], Tratamiento: ["Manchas", "Acné"] } },
    Maquillaje: { icon: "💄", subs: { Rostro: ["Base", "Corrector", "Rubor"], Ojos: ["Sombras", "Delineador", "Máscara"], Labios: ["Labial", "Gloss"] } },
    Hombres: { icon: "🧔", subs: { Piel: ["Limpiador facial", "Hidratante"], Barba: ["Aceite de barba", "Bálsamo"] } },
    Uñas: { icon: "💅", subs: { Color: ["Esmaltes", "Gel UV"], Cuidado: ["Fortalecedor", "Cuticulas"] } },
  };
}
