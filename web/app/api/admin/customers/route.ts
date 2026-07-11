import { requireAdminApi } from "@/lib/server/require-admin-api";
import { noStoreJson } from "@/lib/server/no-store-json";
import { listAdminCustomers } from "@/lib/server/admin/customer-directory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const data = await listAdminCustomers();
    return noStoreJson(data);
  } catch (e) {
    console.error("[GET /api/admin/customers]", e);
    return noStoreJson({ error: "Error al listar clientes" }, { status: 500 });
  }
}
