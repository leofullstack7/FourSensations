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
      stats: { totalCustomers: 0, registeredCount: 0, guestCount: 0, wholesaleEligibleCount: 0 },
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
  const users =
    emails.length > 0
      ? await prisma.user.findMany({
          where: {
            OR: emails.map((email) => ({ email: { equals: email, mode: "insensitive" as const } })),
            role: "CUSTOMER",
          },
          select: { id: true, email: true, name: true, emailVerified: true },
        })
      : [];

  const userByEmail = new Map<string, (typeof users)[number]>();
  for (const u of users) {
    if (u.email) userByEmail.set(normalizeCustomerEmail(u.email), u);
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

    const phone = bucket.phones[0] ?? null;

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

    customers.push({
      id: email,
      email,
      name,
      phone,
      isRegistered,
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
    const ta = a.lastOrderAt ?? "";
    const tb = b.lastOrderAt ?? "";
    return tb.localeCompare(ta);
  });

  let registeredCount = 0;
  let wholesaleEligibleCount = 0;
  for (const c of customers) {
    if (c.isRegistered) registeredCount++;
    if (c.isWholesaleEligible) wholesaleEligibleCount++;
  }

  return {
    customers,
    stats: {
      totalCustomers: customers.length,
      registeredCount,
      guestCount: customers.length - registeredCount,
      wholesaleEligibleCount,
    },
  };
}
