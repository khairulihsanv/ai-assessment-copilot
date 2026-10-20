"use client";

import {
  Award,
  BarChart3,
  Bot,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
      <img src="/dexa-logo.png" alt="" width={36} height={36} className={styles.brandLogo} />
      <span className={styles.brandText}>
        <strong>Dexa Assessment</strong>
        <span>{user.role === "DOSEN" ? "Ruang kerja dosen" : "Ruang belajar"}</span>
      </span>
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
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/classes", label: "Kelas Kuliah", icon: GraduationCap },
    {
      href: "/assignments",
      label: isDosen ? "Tugas & Penugasan" : "Tugas & Evaluasi",
      icon: ClipboardList,
    },
    ...(isDosen
      ? [
          { href: "/grading", label: "Koreksi & Asesmen AI", icon: Sparkles },
          { href: "/rubrics", label: "Rubrik Penilaian", icon: CheckSquare },
          { href: "/analytics", label: "Laporan & Analitik", icon: BarChart3 },
        ]
      : [
          { href: "/grades", label: "Riwayat Nilai", icon: Award },
          { href: "/copilot", label: "AI Study Copilot", icon: Bot },
        ]),
  ];

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(styles.navigation, compact && styles.compactNavigation)}
    >
      <p className={compact ? "sr-only" : styles.sectionLabel}>Menu utama</p>
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
                <Icon size={19} aria-hidden="true" />
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
        title={compact ? "Pengaturan Akun" : undefined}
        aria-current={pathname === "/settings" ? "page" : undefined}
        className={styles.navLink}
      >
        <Settings size={19} aria-hidden="true" />
        <span className={compact ? "sr-only" : styles.linkLabel}>
          {isDosen ? "Pengaturan Akun" : "Pengaturan"}
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
          <Menu size={20} aria-hidden="true" />
        </button>
      </div>
      <div id="desktop-workspace-navigation" className={styles.scrollArea}>
        <WorkspaceNavigation user={user} compact={!sidebarOpen} />
      </div>
      <WorkspaceAccount user={user} compact={!sidebarOpen} />
    </aside>
  );
}
