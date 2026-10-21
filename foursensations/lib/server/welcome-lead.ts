import { prisma } from "@/lib/prisma";
import { ensureStoreSchemaExtras } from "@/lib/server/ensure-schema";

function digitsPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Lead de cupón: usuario CUSTOMER solo con correo + WhatsApp (sin contraseña). */
export async function upsertWelcomeLead(emailRaw: string, whatsappRaw: string): Promise<void> {
  await ensureStoreSchemaExtras();
  const email = emailRaw.trim().toLowerCase();
  const phone = digitsPhone(whatsappRaw);
  if (!email || phone.length < 10) return;

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, phone: true, passwordHash: true },
  });

  if (existing) {
    if (!existing.phone) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { phone },
      });
    }
    return;
  }

  await prisma.user.create({
    data: {
      email,
      phone,
      role: "CUSTOMER",
      name: null,
    },
  });
}

/** Completa ficha CRM del lead cuando compra (nombre, dirección, ciudad, teléfono). */
export async function enrichCustomerFromCheckout(input: {
  email: string;
  name: string;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
}): Promise<void> {
  await ensureStoreSchemaExtras();
  const email = input.email.trim().toLowerCase();
  if (!email) return;

  // Por email único: no fallar si el correo ya existe (lead, intento previo, etc.).
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, name: true, phone: true, city: true, address: true, role: true },
  });

  const phone = input.phone ? digitsPhone(input.phone) : "";
  const name = input.name.trim();
  const city = input.city?.trim() || null;
  const address = input.address?.trim() || null;

  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        role: "CUSTOMER",
        name: name || null,
        phone: phone || null,
        city,
        address,
      },
    });
    return;
  }

  // No tocar cuentas ADMIN; sí enriquecer clientes/leads que ya interactuaron.
  if (existing.role === "ADMIN") return;

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: existing.name?.trim() ? existing.name : name || existing.name,
      phone: existing.phone || phone || null,
      city: existing.city || city,
      address: existing.address || address,
    },
  });
}
