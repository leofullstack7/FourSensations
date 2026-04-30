import { NextRequest, NextResponse } from "next/server";
import { CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";
import {
  customerLoginSchema,
  formatCustomerAuthZodError,
} from "@/lib/validation/customer-auth";

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = customerLoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatCustomerAuthZodError(parsed.error) },
      { status: 400 }
    );
  }

  try {
    await signIn("customer-credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof CredentialsSignin) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      );
    }
    console.error("[POST /api/auth/customer/login]", e);
    return NextResponse.json({ error: "No se pudo iniciar sesión" }, { status: 500 });
  }
}
