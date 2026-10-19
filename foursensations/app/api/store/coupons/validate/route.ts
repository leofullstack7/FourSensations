import { noStoreJson } from "@/lib/server/no-store-json";
import { quoteCouponForCart } from "@/lib/server/coupons";
import { storeValidateCouponSchema } from "@/lib/validation/coupons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = storeValidateCouponSchema.safeParse(json);
  if (!parsed.success) {
    return noStoreJson({ error: "Datos inválidos" }, { status: 400 });
  }

  const result = await quoteCouponForCart(parsed.data.code, {
    subtotal: parsed.data.subtotal,
    shipping: parsed.data.shipping,
    customerEmail: parsed.data.customerEmail,
    productIds: parsed.data.productIds,
    comboIds: parsed.data.comboIds,
    isWholesale: parsed.data.isWholesale,
  });

  if (!result.ok) {
    return noStoreJson(
      {
        error: result.error,
        blockedProducts: "blockedProducts" in result ? result.blockedProducts : undefined,
      },
      { status: 400 },
    );
  }

  return noStoreJson({
    ok: true,
    code: result.code,
    name: result.name,
    label: result.label,
    discount: result.discount,
    shippingAfter: result.shippingAfter,
    /** El descuento aplica solo al subtotal del pedido; el envío queda intacto. */
    appliesTo: "subtotal",
  });
}
