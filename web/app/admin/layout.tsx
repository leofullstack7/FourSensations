import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GinnaBeauty — Panel Administrativo",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
