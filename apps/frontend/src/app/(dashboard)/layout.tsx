import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/features/dashboard-sidebar";
import { DashboardTopbar } from "@/components/features/dashboard-topbar";
import { SessionGuard } from "@/components/features/session-guard";
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

  return (
    <div className="workspace-shell flex min-h-screen bg-background text-foreground">
      <SessionGuard />
      <DashboardSidebar user={userData} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopbar user={userData} />
        <main id="main-content" className="workspace-main flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
