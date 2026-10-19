"use client";

import {
  Award,
  BarChart3,
  BookOpen,
  Bot,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, getInitials } from "@/shared/utils";
import { useUIStore } from "@/stores/ui-store";

export interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: string;
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
  const items = [
    { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
    { href: "/classes", label: "Kelas saya", icon: BookOpen },
    { href: "/assignments", label: "Tugas", icon: ClipboardList },
    ...(user.role === "DOSEN"
      ? [
          { href: "/grading", label: "Koreksi jawaban", icon: Sparkles },
          { href: "/rubrics", label: "Rubrik penilaian", icon: CheckSquare },
          { href: "/analytics", label: "Laporan kelas", icon: BarChart3 },
        ]
      : [
          { href: "/grades", label: "Nilai & umpan balik", icon: Award },
          { href: "/copilot", label: "Study Copilot", icon: Bot },
        ]),
  ];
  return (
    <nav aria-label="Navigasi utama" className="workspace-nav">
      {!compact && (
        <p className="workspace-nav-label">
          RUANG {user.role === "DOSEN" ? "MENGAJAR" : "BELAJAR"}
        </p>
      )}
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}
          title={compact ? label : undefined}
          className={cn("workspace-nav-item", compact && "justify-center")}
        >
          <Icon size={19} strokeWidth={1.7} />
          <span className={compact ? "sr-only" : "truncate"}>{label}</span>
        </Link>
      ))}
      <div className="my-5 border-t" />
      <Link
        href="/settings"
        onClick={onNavigate}
        aria-current={pathname === "/settings" ? "page" : undefined}
        title={compact ? "Pengaturan" : undefined}
        className={cn("workspace-nav-item", compact && "justify-center")}
      >
        <Settings size={19} strokeWidth={1.7} />
        <span className={compact ? "sr-only" : ""}>Pengaturan</span>
      </Link>
    </nav>
  );
}

export function DashboardSidebar({ user }: { user: WorkspaceUser }) {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  return (
    <aside className={cn("workspace-sidebar", !sidebarOpen && "workspace-sidebar-compact")}>
      <Link href="/dashboard" className="workspace-brand" aria-label="Dexa Assessment — Ringkasan">
        <Image src="/dexa-logo.png" alt="" width={38} height={38} />
        {sidebarOpen && (
          <span>
            <strong>
              dexa<span className="text-primary">.</span>
            </strong>
            <small>ASSESSMENT</small>
          </span>
        )}
      </Link>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <WorkspaceNavigation user={user} compact={!sidebarOpen} />
      </div>
      {sidebarOpen && (
        <div className="workspace-note">
          <BookOpen size={20} />
          <p>
            Lebih banyak waktu
            <br />
            <strong>untuk mengajar.</strong>
          </p>
          <span>AI membantu. Anda memutuskan.</span>
        </div>
      )}
      <div className="workspace-account">
        {sidebarOpen && (
          <>
            <span className="workspace-avatar">{getInitials(user.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{user.name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {user.role === "DOSEN" ? "Dosen" : "Mahasiswa"}
              </p>
            </div>
          </>
        )}
        <button
          type="button"
          title="Keluar dari akun"
          aria-label="Keluar dari akun"
          className="workspace-icon-button"
          onClick={async () => {
            sessionStorage.removeItem("dexa_session_active");
            localStorage.removeItem("dexa_remember_me");
            try {
              await fetch("/api/auth/logout", { method: "POST" });
            } catch {
              /* Navigation still clears the local session. */
            }
            window.location.assign("/login");
          }}
        >
          <LogOut size={17} />
        </button>
      </div>
      <button
        type="button"
        onClick={toggleSidebar}
        className="workspace-collapse"
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? "Ciutkan sidebar" : "Perluas sidebar"}
      >
        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </aside>
  );
}
