import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

export type CustomerAccountSession = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  isWholesale: boolean;
  city: string | null;
  address: string | null;
};

export async function getStoreCustomerSession(): Promise<CustomerAccountSession | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || session.user.role !== "CUSTOMER") return null;
  let isWholesale = Boolean(session.user.isWholesale);
  let city: string | null = null;
  let address: string | null = null;
  try {
    const row = await prisma.user.findUnique({
      where: { id },
      select: { isWholesale: true, city: true, address: true, name: true, email: true, image: true },
    });
    if (row) {
      isWholesale = row.isWholesale;
      city = row.city;
      address = row.address;
    }
    return {
      id,
      name: row?.name?.trim() || session.user.name?.trim() || session.user.email?.split("@")[0] || "Cliente",
      email: row?.email ?? session.user.email ?? null,
      image: row?.image ?? session.user.image ?? null,
      isWholesale,
      city,
      address,
    };
  } catch {
    return {
      id,
      name: session.user.name?.trim() || session.user.email?.split("@")[0] || "Cliente",
      email: session.user.email ?? null,
      image: session.user.image ?? null,
      isWholesale,
      city,
      address,
    };
  }
}

export type CustomerOrderItemView = {
  id: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CustomerOrderView = {
  id: string;
  reference: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  createdAt: string;
  city: string | null;
  items: CustomerOrderItemView[];
};

function readCity(shippingAddress: unknown): string | null {
  if (!shippingAddress || typeof shippingAddress !== "object") return null;
  const city = (shippingAddress as { city?: unknown }).city;
  return typeof city === "string" && city.trim() ? city.trim() : null;
}

export async function listCustomerOrders(userId: string, email: string | null): Promise<CustomerOrderView[]> {
  const emailNorm = email?.trim().toLowerCase() || null;
  const rows = await prisma.order.findMany({
    where: {
      OR: [
        { userId },
        ...(emailNorm ? [{ customerEmail: { equals: emailNorm, mode: "insensitive" as const } }] : []),
      ],
    },
    include: { items: { orderBy: { name: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rows.map((order) => ({
    id: order.id,
    reference: order.reference,
    status: order.status,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    city: readCity(order.shippingAddress),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
  }));
}
