import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveWholesaleCycle } from "@/lib/wholesale-rules";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({
      isWholesale: false,
      authenticated: false,
      accumulatedSpend: 0,
      minimumOrder: 700_000,
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { isWholesale: true, email: true, name: true, city: true, address: true },
    });
    const isWholesale = Boolean(user?.isWholesale);
    if (!isWholesale) {
      return NextResponse.json({
        isWholesale: false,
        authenticated: true,
        accumulatedSpend: 0,
        minimumOrder: 700_000,
        name: user?.name ?? session.user.name,
        email: user?.email ?? session.user.email,
      });
    }

    const emailNorm = user?.email?.trim().toLowerCase() || null;
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: id },
          ...(emailNorm ? [{ customerEmail: { equals: emailNorm, mode: "insensitive" as const } }] : []),
        ],
      },
      select: { total: true, createdAt: true, paymentStatus: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    const cycle = resolveWholesaleCycle(orders);
    return NextResponse.json({
      isWholesale: true,
      authenticated: true,
      name: user?.name ?? session.user.name,
      email: user?.email ?? session.user.email,
      city: user?.city ?? null,
      address: user?.address ?? null,
      ...cycle,
    });
  } catch (e) {
    console.error("[GET /api/wholesale/me]", e);
    return NextResponse.json({ error: "No se pudo leer el perfil mayorista" }, { status: 500 });
  }
}
