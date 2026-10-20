"use client";

import { ChevronRight, Menu, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn, getInitials } from "@/shared/utils";
import { useThemeStore } from "@/stores/theme-store";
import {
  WorkspaceAccount,
  WorkspaceBrand,
  WorkspaceNavigation,
  type WorkspaceUser,
} from "./dashboard-sidebar";
import styles from "./dashboard-topbar.module.css";
import navigationStyles from "./workspace-navigation.module.css";

const labels: Record<string, string> = {
  dashboard: "Ringkasan",
  classes: "Kelas",
  assignments: "Tugas",
  grading: "Koreksi",
  rubrics: "Rubrik penilaian",
  analytics: "Laporan",
  grades: "Nilai saya",
  copilot: "Study Copilot",
  settings: "Pengaturan",
  calendar: "Kalender",
};

export function DashboardTopbar({ user }: { user: WorkspaceUser }) {
  const path = usePathname().split("/").filter(Boolean);
  const dialog = useRef<HTMLDialogElement>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { resolvedTheme, setTheme } = useThemeStore();

  // A mobile dialog must not keep blocking the workspace after resizing to desktop.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialog.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!navigationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [navigationOpen]);

  const closeNavigation = () => dialog.current?.close();

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.breadcrumbArea}>
          <button
            type="button"
            onClick={() => {
              dialog.current?.showModal();
              setNavigationOpen(true);
            }}
            aria-label="Buka navigasi"
            aria-expanded={navigationOpen}
            aria-controls="mobile-workspace-navigation"
            className={cn(styles.iconButton, styles.mobileTrigger)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <span className={styles.workspaceLabel}>Ruang kerja</span>
            <ChevronRight size={14} className={styles.workspaceChevron} aria-hidden="true" />
            <Link href={`/${path[0] || "dashboard"}`}>
              {labels[path[0] || "dashboard"] || "Ruang kerja"}
            </Link>
            {path.length > 1 && (
              <span className={styles.detail}>
                <ChevronRight size={14} aria-hidden="true" />
                {path.includes("submissions")
                  ? "Tinjau jawaban"
                  : path.includes("assignments")
                    ? "Detail tugas"
                    : "Detail"}
              </span>
            )}
          </nav>
        </div>
        <div className={styles.accountActions}>
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label={resolvedTheme === "dark" ? "Gunakan tema terang" : "Gunakan tema gelap"}
            title={resolvedTheme === "dark" ? "Gunakan tema terang" : "Gunakan tema gelap"}
            aria-pressed={resolvedTheme === "dark"}
            className={styles.iconButton}
          >
            {resolvedTheme === "dark" ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </button>
          <Link
            href="/settings"
            aria-label={`Pengaturan akun ${user.name}`}
            title={user.name}
            className={styles.accountLink}
          >
            {getInitials(user.name)}
          </Link>
        </div>
      </header>
      <dialog
        ref={dialog}
        id="mobile-workspace-navigation"
        aria-label="Navigasi Dexa Assessment"
        onClose={() => setNavigationOpen(false)}
        className={cn(navigationStyles.palette, navigationStyles.drawer)}
      >
        <div className={navigationStyles.drawerInner}>
          <div className={navigationStyles.brandRow}>
            <WorkspaceBrand user={user} onNavigate={closeNavigation} />
            <button
              type="button"
              onClick={closeNavigation}
              aria-label="Tutup navigasi"
              className={navigationStyles.collapseButton}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className={navigationStyles.scrollArea}>
            <WorkspaceNavigation user={user} onNavigate={closeNavigation} />
          </div>
          <WorkspaceAccount user={user} />
        </div>
      </dialog>
    </>
  );
}
