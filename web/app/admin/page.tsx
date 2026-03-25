import { auth } from "@/auth";
import { AdminApp } from "@/components/admin/AdminApp";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  if (session.user.role !== "ADMIN") redirect("/admin/login?error=forbidden");
  return <AdminApp />;
}
