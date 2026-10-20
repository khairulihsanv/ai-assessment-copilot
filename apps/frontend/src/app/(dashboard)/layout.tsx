import { redirect } from "next/navigation";
import { DashboardFrame } from "@/components/features/dashboard-frame";
import { auth } from "@/server/auth/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userData = {
    id: session.user.id,
    name: session.user.name || "User",
    email: session.user.email || "",
    role: session.user.role,
  };

  return <DashboardFrame user={userData}>{children}</DashboardFrame>;
}
