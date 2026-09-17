import { z } from "zod";

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(120),
  email: z.string().trim().email("Correo no válido").max(254),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(128),
});

export const customerLoginSchema = z.object({
  email: z.string().trim().email("Correo no válido").max(254),
  password: z.string().min(1, "Contraseña requerida").max(128),
});

export function formatCustomerAuthZodError(err: z.ZodError): string {
  return err.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
}
