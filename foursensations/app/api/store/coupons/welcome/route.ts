import { NextRequest } from "next/server";
import { noStoreJson } from "@/lib/server/no-store-json";
import { claimWelcomeCoupon } from "@/lib/server/welcome-coupon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { email?: string } | null;
    const email = body?.email?.trim() || "";
    if (!email) {
      return noStoreJson({ error: "Ingresa tu correo electrónico." }, { status: 400 });
    }

    const result = await claimWelcomeCoupon(email);
    if (!result.ok) {
      return noStoreJson({ error: result.error }, { status: 400 });
    }

    if (result.alreadySent) {
      return noStoreJson({
        ok: true,
        alreadySent: true,
        message: result.message,
      });
    }

    return noStoreJson({
      ok: true,
      alreadySent: false,
      code: result.code,
      name: result.name,
      valueLabel: result.valueLabel,
      message: result.message,
    });
  } catch (e) {
    console.error("[POST /api/store/coupons/welcome]", e);
    return noStoreJson({ error: "No pudimos procesar tu cupón ahora." }, { status: 500 });
  }
}
