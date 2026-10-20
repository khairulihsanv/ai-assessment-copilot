"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceThemeProvider } from "@/components/workspace-theme";
import palette from "@/components/workspace-theme.module.css";
import { cn } from "@/shared/utils";
import styles from "./dashboard-frame.module.css";
import { DashboardSidebar, type WorkspaceUser } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import { SessionGuard } from "./session-guard";

export function DashboardFrame({ user, children }: { user: WorkspaceUser; children: ReactNode }) {
  const pathname = usePathname();
  const isDosenOverview = user.role === "DOSEN" && pathname === "/dashboard";

  return (
    <WorkspaceThemeProvider>
      <div className={cn(palette.palette, styles.workspace)} data-workspace>
        <SessionGuard />
        <DashboardSidebar user={user} />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardTopbar user={user} />
          <main
            id="main-content"
            className={isDosenOverview ? styles.content : "flex-1 px-4 py-6 sm:px-8 sm:py-8 pb-10"}
          >
            {children}
          </main>
        </div>
      </div>
    </WorkspaceThemeProvider>
  );
}
