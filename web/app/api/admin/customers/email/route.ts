import { z } from "zod";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { noStoreJson } from "@/lib/server/no-store-json";
import { sendCrmCustomerEmail } from "@/lib/server/email/customer-crm-mail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.object({
  to: z.string().email().max(320),
  customerName: z.string().min(1).max(200),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(8000),
});

export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return noStoreJson({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await sendCrmCustomerEmail(parsed.data);
  if (!result.ok) {
    return noStoreJson({ error: result.error }, { status: 502 });
  }

  return noStoreJson({ ok: true });
}
