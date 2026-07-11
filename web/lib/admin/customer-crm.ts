export const WHOLESALE_THRESHOLD_COP = 700_000;

export type AdminCustomerOrder = {
  id: string;
  reference: string;
  total: number;
  createdAt: string;
  paymentProvider: string | null;
  itemCount: number;
  itemsSummary: string;
};

export type AdminCustomerRecord = {
  /** Clave estable: correo normalizado. */
  id: string;
  email: string;
  name: string;
  phone: string | null;
  /** Cuenta en la tienda (registro / Google / email). */
  isRegistered: boolean;
  userId: string | null;
  registeredAt: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  /** Al menos un pedido ≥ umbral mayorista. */
  isWholesaleEligible: boolean;
  orders: AdminCustomerOrder[];
};

export type AdminCustomersResponse = {
  customers: AdminCustomerRecord[];
  stats: {
    totalCustomers: number;
    registeredCount: number;
    guestCount: number;
    wholesaleEligibleCount: number;
  };
};

export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function customerFirstName(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return part || "Cliente";
}

export function buildWhatsappPromoMessage(name: string): string {
  const first = customerFirstName(name);
  return `Hola ${first}, soy del equipo de GinnaBeauty 💕 Queremos contarte sobre una promoción especial pensada para ti: precios exclusivos, novedades del catálogo y beneficios para clientes frecuentes. ¿Te gustaría que te compartamos los detalles?`;
}

export function whatsappUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const normalized = digits.startsWith("57") ? digits : `57${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
