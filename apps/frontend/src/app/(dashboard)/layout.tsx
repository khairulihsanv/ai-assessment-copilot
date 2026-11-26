import localFont from "next/font/local";
import { redirect } from "next/navigation";
import { DashboardFrame } from "@/components/features/dashboard-frame";
import { auth } from "@/server/auth/auth";

// Self-hosted like the root fonts (see app/layout.tsx): no Google request at build time.
const workspaceFont = localFont({
  src: "../fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  display: "swap",
  weight: "200 800",
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
