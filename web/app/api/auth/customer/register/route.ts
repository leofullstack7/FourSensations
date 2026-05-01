import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  customerRegisterSchema,
  formatCustomerAuthZodError,
} from "@/lib/validation/customer-auth";

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = customerRegisterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatCustomerAuthZodError(parsed.error) },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;
  const emailNorm = email.trim().toLowerCase();

  try {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: emailNorm, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con este correo electrónico" },
        { status: 409 }
      );
    }

    // Coste 10: equilibrio velocidad/seguridad (12 era notablemente lento en registro en hardware típico).
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailNorm,
        passwordHash,
        role: "CUSTOMER",
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/auth/customer/register]", e);
    return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 500 });
  }
}
