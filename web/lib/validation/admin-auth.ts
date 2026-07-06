import { z } from "zod";

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "Email requerido").max(254),
  password: z.string().min(1, "Contraseña requerida").max(128),
});

export function formatAdminLoginZodError(err: z.ZodError): string {
  return err.issues.map((e) => e.message).join("; ");
}
