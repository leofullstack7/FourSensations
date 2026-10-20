import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  WHOLESALE_THRESHOLD_COP,
  normalizeCustomerEmail,
  type AdminCustomerRecord,
  type AdminCustomersResponse,
} from "@/lib/admin/customer-crm";

type OrderRow = {
  id: string;
  reference: string;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  paymentProvider: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  userId: string | null;
  items: Array<{ name: string; quantity: number }>;
};

export async function listAdminCustomers(): Promise<AdminCustomersResponse> {
  if (!process.env.DATABASE_URL) {
    return {
      customers: [],
      stats: {
        totalCustomers: 0,
        registeredCount: 0,
        guestCount: 0,
        wholesaleEligibleCount: 0,
        couponLeadCount: 0,
      },
    };
  }

  const rows = (await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.APPROVED,
      status: { not: OrderStatus.CANCELLED },
    },
    include: {
      items: { select: { name: true, quantity: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  })) as OrderRow[];

  const byEmail = new Map<
    string,
    {
      email: string;
      names: string[];
      phones: string[];
      userIds: Set<string>;
      orders: OrderRow[];
    }
  >();

  for (const o of rows) {
    const email = normalizeCustomerEmail(o.customerEmail);
    if (!email) continue;

    let bucket = byEmail.get(email);
    if (!bucket) {
      bucket = { email, names: [], phones: [], userIds: new Set(), orders: [] };
      byEmail.set(email, bucket);
    }
    bucket.names.push(o.customerName.trim());
    if (o.customerPhone?.trim()) bucket.phones.push(o.customerPhone.trim());
    if (o.userId) bucket.userIds.add(o.userId);
    bucket.orders.push(o);
  }

  const emails = Array.from(byEmail.keys());
  const users = await prisma.user.findMany({
    where: { role: "CUSTOMER", email: { not: null } },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      phone: true,
      city: true,
      address: true,
    },
    take: 5000,
  });

  const userByEmail = new Map<string, (typeof users)[number]>();
  for (const u of users) {
    if (u.email) userByEmail.set(normalizeCustomerEmail(u.email), u);
  }

  // Leads de cupón / CRM sin pedidos aún
  for (const u of users) {
    const email = u.email ? normalizeCustomerEmail(u.email) : "";
    if (!email || byEmail.has(email)) continue;
    byEmail.set(email, {
      email,
      names: u.name ? [u.name] : [],
      phones: u.phone ? [u.phone] : [],
      userIds: new Set([u.id]),
      orders: [],
    });
  }

  const customers: AdminCustomerRecord[] = [];

  for (const [email, bucket] of byEmail) {
    const linkedUser = userByEmail.get(email) ?? null;
    const userId = linkedUser?.id ?? (bucket.userIds.size === 1 ? [...bucket.userIds][0]! : null);
    const isRegistered = !!linkedUser;

    const name =
      linkedUser?.name?.trim() ||
      bucket.names.find((n) => n.length > 0) ||
      "Cliente";

    const phone = bucket.phones[0] ?? linkedUser?.phone ?? null;

    const orders = bucket.orders
      .map((o) => {
        const items = o.items;
        const itemCount = items.reduce((s, i) => s + i.quantity, 0);
        const first = items[0]?.name ?? "Pedido";
        const itemsSummary =
          items.length <= 1 ? first : `${first} + ${items.length - 1} producto(s) más`;
        return {
          id: o.id,
          reference: o.reference,
          total: o.total,
          createdAt: o.createdAt.toISOString(),
          paymentProvider: o.paymentProvider,
          itemCount,
          itemsSummary,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const totalSpent = orders.reduce((s, o) => s + o.total, 0);
    const isWholesaleEligible = orders.some((o) => o.total >= WHOLESALE_THRESHOLD_COP);
    const hasRealName = Boolean(linkedUser?.name?.trim()) || bucket.names.some((n) => n.trim().length > 2);
    const hasAddress = Boolean(linkedUser?.address?.trim() || linkedUser?.city?.trim());
    /** Lead de cupón: correo+WhatsApp sin ficha completa (aún no pasó por checkout enriquecido). */
    const isCouponLead =
      Boolean(linkedUser) &&
      orders.length === 0 &&
      (!hasRealName || !hasAddress);

    customers.push({
      id: email,
      email,
      name: isCouponLead && !linkedUser?.name?.trim() ? "Lead cupón" : name,
      phone,
      city: linkedUser?.city ?? null,
      address: linkedUser?.address ?? null,
      isRegistered,
      isCouponLead,
      userId,
      registeredAt: linkedUser?.emailVerified?.toISOString() ?? null,
      orderCount: orders.length,
      totalSpent,
      lastOrderAt: orders[0]?.createdAt ?? null,
      isWholesaleEligible,
      orders,
    });
  }

  customers.sort((a, b) => {
    const ta = a.lastOrderAt ?? a.registeredAt ?? "";
    const tb = b.lastOrderAt ?? b.registeredAt ?? "";
    return tb.localeCompare(ta);
  });

  let registeredCount = 0;
  let wholesaleEligibleCount = 0;
  let couponLeadCount = 0;
  for (const c of customers) {
    if (c.isCouponLead) couponLeadCount++;
    else if (c.isRegistered) registeredCount++;
    if (c.isWholesaleEligible) wholesaleEligibleCount++;
  }

  const mainCustomers = customers.filter((c) => !c.isCouponLead);
  const couponLeads = customers.filter((c) => c.isCouponLead);

  return {
    customers: [...mainCustomers, ...couponLeads],
    stats: {
      totalCustomers: mainCustomers.length,
      registeredCount,
      guestCount: mainCustomers.length - registeredCount,
      wholesaleEligibleCount,
      couponLeadCount,
    },
  };
}
