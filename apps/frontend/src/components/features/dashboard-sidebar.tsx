"use client";

import {
  Award,
  BarChart3,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PanelLeft,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { cn, getInitials } from "@/shared/utils";
import { useUIStore } from "@/stores/ui-store";
import styles from "./workspace-navigation.module.css";

export interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function WorkspaceBrand({
  user,
  onNavigate,
}: {
  user: WorkspaceUser;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className={styles.brand}
      aria-label="Dexa Assessment — Ringkasan"
    >
      <Brand subtitle={user.role === "DOSEN" ? "Ruang kerja dosen" : "Ruang belajar"} />
    </Link>
  );
}

export function WorkspaceNavigation({
  user,
  compact = false,
  onNavigate,
}: {
  user: WorkspaceUser;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isDosen = user.role === "DOSEN";
  const items = [
    { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
    { href: "/classes", label: "Kelas", icon: GraduationCap },
    { href: "/assignments", label: "Tugas", icon: ClipboardList },
    ...(isDosen
      ? [
          { href: "/grading", label: "Koreksi", icon: CheckSquare },
          { href: "/rubrics", label: "Rubrik", icon: ListChecks },
          { href: "/analytics", label: "Analitik", icon: BarChart3 },
        ]
      : [{ href: "/grades", label: "Nilai saya", icon: Award }]),
  ];

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(styles.navigation, compact && styles.compactNavigation)}
    >
      <p className="sr-only">Menu utama</p>
      <ul className={styles.navList}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={compact ? label : undefined}
                className={styles.navLink}
              >
                <Icon size={18} aria-hidden="true" />
                <span className={compact ? "sr-only" : styles.linkLabel}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={styles.navDivider} />
      <Link
        href="/settings"
        onClick={onNavigate}
        title={compact ? "Pengaturan" : undefined}
        aria-current={pathname === "/settings" ? "page" : undefined}
        className={styles.navLink}
      >
        <Settings size={18} aria-hidden="true" />
        <span className={compact ? "sr-only" : styles.linkLabel}>
          Pengaturan
        </span>
      </Link>
    </nav>
  );
}

export function WorkspaceAccount({
  user,
  compact = false,
}: {
  user: WorkspaceUser;
  compact?: boolean;
}) {
  const [leaving, setLeaving] = useState(false);
  const handleLogout = async () => {
    if (leaving) return;
    setLeaving(true);
    sessionStorage.removeItem("dexa_session_active");
    localStorage.removeItem("dexa_remember_me");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The frontend logout route clears its cookie even if the backend cannot be reached.
    }
    window.location.assign("/login");
  };

  return (
    <div className={cn(styles.account, compact && styles.compactAccount)}>
      <span className={styles.accountAvatar} aria-hidden="true">
        {getInitials(user.name)}
      </span>
      <div className={styles.accountIdentity}>
        <p title={user.name}>{user.name}</p>
        <span>{user.role === "DOSEN" ? "Dosen" : "Mahasiswa"}</span>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={leaving}
        className={styles.logoutButton}
        title="Keluar dari Akun"
        aria-label="Keluar dari akun"
      >
        <LogOut size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

export function DashboardSidebar({ user }: { user: WorkspaceUser }) {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  return (
    <aside
      className={cn(styles.palette, styles.sidebar)}
      data-workspace-sidebar
      data-collapsed={!sidebarOpen}
      aria-label="Sidebar ruang kerja"
    >
      <div className={styles.brandRow}>
        {sidebarOpen && <WorkspaceBrand user={user} />}
        <button
          type="button"
          onClick={toggleSidebar}
          className={styles.collapseButton}
          aria-label={sidebarOpen ? "Ciutkan sidebar" : "Perluas sidebar"}
          title={sidebarOpen ? "Ciutkan sidebar" : "Perluas sidebar"}
          aria-expanded={sidebarOpen}
          aria-controls="desktop-workspace-navigation"
        >
          <PanelLeft size={18} aria-hidden="true" />
        </button>
      </div>
      <div id="desktop-workspace-navigation" className={styles.scrollArea}>
        <WorkspaceNavigation user={user} compact={!sidebarOpen} />
      </div>
      <WorkspaceAccount user={user} compact={!sidebarOpen} />
    </aside>
  );
}
