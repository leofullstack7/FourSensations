import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

  try {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: emailNorm, mode: "insensitive" } },
    });

    if (existing) {
      if (existing.role === "ADMIN") {
        return NextResponse.json({ error: "Este correo no puede registrarse como mayorista" }, { status: 409 });
      }
      if (!existing.passwordHash) {
        return NextResponse.json(
          { error: "Esta cuenta entra con Google. Inicia sesión y completa el registro mayorista desde tu perfil." },
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
