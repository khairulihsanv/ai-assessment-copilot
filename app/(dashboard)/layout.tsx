import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/features/dashboard-sidebar";
import { DashboardTopbar } from "@/components/features/dashboard-topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userData = {
    id: session.user.id,
    name: session.user.name || "User",
    email: session.user.email || "",
    role: session.user.role,
  };

  return (
    <div className="flex min-h-screen" style={{ background: "var(--surface)" }}>
      <DashboardSidebar user={userData} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopbar user={userData} />
        <main id="main-content" className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
