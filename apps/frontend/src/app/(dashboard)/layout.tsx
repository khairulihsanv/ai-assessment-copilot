import { Plus_Jakarta_Sans } from "next/font/google";
import { redirect } from "next/navigation";
import { DashboardFrame } from "@/components/features/dashboard-frame";
import { auth } from "@/server/auth/auth";

const workspaceFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

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
    <>
      {/* On body rather than the frame, so dialogs rendered in a portal get the font too. */}
      <style href="workspace-font" precedence="default">
        {`body:has([data-workspace]){--font-inter:${workspaceFont.style.fontFamily};font-family:${workspaceFont.style.fontFamily}}`}
      </style>
      <DashboardFrame user={userData}>{children}</DashboardFrame>
    </>
  );
}
