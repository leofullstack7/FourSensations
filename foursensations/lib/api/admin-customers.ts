import type { AdminCustomersResponse } from "@/lib/admin/customer-crm";
import { adminFetch } from "@/lib/api/admin-fetch";

export async function fetchAdminCustomers(): Promise<AdminCustomersResponse> {
  const res = await adminFetch("/api/admin/customers", { credentials: "include", cache: "no-store" });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Error ${res.status} al cargar clientes`);
  }
  return (await res.json()) as AdminCustomersResponse;
}

export async function sendAdminCustomerEmail(payload: {
  to: string;
  customerName: string;
  subject: string;
  body: string;
}): Promise<void> {
  const res = await adminFetch("/api/admin/customers/email", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Error ${res.status} al enviar correo`);
  }
}
