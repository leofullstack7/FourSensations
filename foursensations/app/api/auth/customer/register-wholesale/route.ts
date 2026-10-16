import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCustomerAuthZodError, wholesaleRegisterSchema } from "@/lib/validation/customer-auth";

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = wholesaleRegisterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: formatCustomerAuthZodError(parsed.error) }, { status: 400 });
  }

  const { name, email, password, city, address } = parsed.data;
  const emailNorm = email.trim().toLowerCase();
  const session = await auth();
  const sessionId = session?.user?.id;
  const sessionIsCustomer = session?.user?.role === "CUSTOMER" && Boolean(sessionId);

  try {
    if (sessionIsCustomer && sessionId) {
      const current = await prisma.user.findUnique({
        where: { id: sessionId },
        select: { id: true, role: true, email: true, passwordHash: true },
      });
      if (!current || current.role !== "CUSTOMER") {
        return NextResponse.json({ error: "Sesión no válida para registro mayorista" }, { status: 403 });
      }
      const sessionEmail = (current.email ?? "").trim().toLowerCase();
      if (sessionEmail && sessionEmail !== emailNorm) {
        return NextResponse.json(
          { error: "Usa el correo de tu cuenta actual para activar mayorista." },
          { status: 409 },
        );
      }
      await prisma.user.update({
        where: { id: current.id },
        data: {
          name: name.trim() || undefined,
          isWholesale: true,
          city: city.trim(),
          address: address.trim(),
          ...(emailNorm && !current.email ? { email: emailNorm } : {}),
        },
      });
      return NextResponse.json({ ok: true, upgraded: true, usedSession: true }, { status: 200 });
    }

    if (!password) {
      return NextResponse.json(
        { error: "Inicia sesión o indica una contraseña para crear la cuenta mayorista." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: emailNorm, mode: "insensitive" } },
    });

    if (existing) {
      if (existing.role === "ADMIN") {
        return NextResponse.json({ error: "Este correo no puede registrarse como mayorista" }, { status: 409 });
      }
      if (!existing.passwordHash) {
        return NextResponse.json(
          { error: "Esta cuenta entra con Google. Inicia sesión y completa el registro mayorista." },
          { status: 409 },
        );
      }
      const ok = await bcrypt.compare(password, existing.passwordHash);
      if (!ok) {
        return NextResponse.json(
          { error: "Ya existe una cuenta con este correo. Usa la contraseña correcta para activar mayorista." },
          { status: 409 },
        );
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name.trim() || existing.name,
          isWholesale: true,
          city: city.trim(),
          address: address.trim(),
        },
      });
      return NextResponse.json({ ok: true, upgraded: true }, { status: 200 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailNorm,
        passwordHash,
        role: "CUSTOMER",
        isWholesale: true,
        city: city.trim(),
        address: address.trim(),
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/auth/customer/register-wholesale]", e);
    return NextResponse.json({ error: "No se pudo crear la cuenta mayorista" }, { status: 500 });
  }
}
