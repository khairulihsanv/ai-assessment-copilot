import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/features/dashboard-sidebar";
import { DashboardTopbar } from "@/components/features/dashboard-topbar";
import { SessionGuard } from "@/components/features/session-guard";

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
<<<<<<< HEAD
    <div className="flex min-h-screen bg-[#F3F4F6] text-[#111827]">
      <SessionGuard />
=======
    <div className="flex min-h-screen bg-background text-foreground">
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
      <DashboardSidebar user={userData} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopbar user={userData} />
        <main id="main-content" className="flex-1 px-4 py-6 sm:px-8 sm:py-8 pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
