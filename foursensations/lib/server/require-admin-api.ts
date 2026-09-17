import { auth } from "@/auth";
import { noStoreJson } from "@/lib/server/no-store-json";

/**
 * Protección en route handlers de `/api/admin/*`.
 * Devuelve respuesta JSON 401/403 o `null` si la sesión es de administradora.
 */
export async function requireAdminApi() {
  const session = await auth();
  if (!session?.user) {
    return noStoreJson({ error: "No autorizado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return noStoreJson({ error: "Prohibido" }, { status: 403 });
  }
  return null;
}

/** Igual que requireAdminApi, pero también entrega email del admin para auditoría. */
export async function requireAdminApiWithActor(): Promise<
  | { denied: Response; actor: null }
  | { denied: null; actor: string | null }
> {
  const session = await auth();
  if (!session?.user) {
    return { denied: noStoreJson({ error: "No autorizado" }, { status: 401 }), actor: null };
  }
  if (session.user.role !== "ADMIN") {
    return { denied: noStoreJson({ error: "Prohibido" }, { status: 403 }), actor: null };
  }
  return { denied: null, actor: session.user.email ?? session.user.name ?? null };
}
