"use client";

import type { ReactNode } from "react";
import { WorkspaceThemeProvider } from "@/components/workspace-theme";
import palette from "@/components/workspace-theme.module.css";
import { cn } from "@/shared/utils";
import styles from "./dashboard-frame.module.css";
import { DashboardSidebar, type WorkspaceUser } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import { SessionGuard } from "./session-guard";

export function DashboardFrame({ user, children }: { user: WorkspaceUser; children: ReactNode }) {
  const isDosen = user.role === "DOSEN";

  return (
    <WorkspaceThemeProvider>
      {/* data-role selects the colour palette (globals.css), which also reaches portalled dialogs. */}
      <div
        className={cn(palette.palette, styles.workspace)}
        data-workspace
        data-role={isDosen ? "dosen" : "mahasiswa"}
      >
        <SessionGuard />
        <div className={styles.frame}>
          {isDosen && <DashboardSidebar user={user} />}
          <div className={styles.column}>
            <DashboardTopbar user={user} />
            <main id="main-content" className={styles.content}>
              {children}
            </main>
          </div>
        </div>
      </div>
    </WorkspaceThemeProvider>
  );
}
