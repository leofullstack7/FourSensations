import { NextRequest, NextResponse } from "next/server";
import { CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";
import { adminLoginSchema, formatAdminLoginZodError } from "@/lib/validation/admin-auth";

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: formatAdminLoginZodError(parsed.error) }, { status: 400 });
  }

  try {
    await signIn("credentials", {
      username: parsed.data.username,
      password: parsed.data.password,
      redirect: false,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof CredentialsSignin) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }
    console.error("[POST /api/auth/admin/login]", e);
    return NextResponse.json({ error: "No se pudo iniciar sesión" }, { status: 500 });
  }
}
