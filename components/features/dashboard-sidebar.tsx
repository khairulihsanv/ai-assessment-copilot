"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

interface SidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const isDosen = user.role === "DOSEN";

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r transition-all duration-300 relative justify-between",
        sidebarOpen ? "w-64" : "w-[72px]"
      )}
      style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Logo Header */}
        <div className="h-16 flex items-center gap-3 px-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: "var(--color-primary-500)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-display text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                Dexa Assessment
              </span>
              <span className="text-[11px] font-mono truncate" style={{ color: "var(--text-muted)" }}>
                Sekolah Vokasi UNS
              </span>
            </div>
          )}
        </div>

        {/* AI Engine Status Pill */}
        {sidebarOpen && (
          <div className="px-3 pt-3">
            <div
              className="p-2 rounded-lg flex items-center justify-between"
              style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                  AI Engine: Active
                </span>
              </div>
              <span
                className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                style={{ background: "color-mix(in oklch, var(--color-primary-500) 15%, transparent)", color: "var(--color-primary-500)" }}
              >
                Gemini 2.0
              </span>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
          {/* Main Navigation */}
          <div className="space-y-1">
            {sidebarOpen && (
              <span className="px-2 text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Utama
              </span>
            )}
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                sidebarOpen ? "" : "justify-center"
              )}
              style={{
                background: pathname === "/dashboard" ? "color-mix(in oklch, var(--color-primary-500) 12%, transparent)" : "transparent",
                color: pathname === "/dashboard" ? "var(--color-primary-500)" : "var(--text-secondary)",
              }}
              title={!sidebarOpen ? "Dashboard Overview" : undefined}
            >
              <LayoutDashboard size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>Dashboard Overview</span>}
            </Link>

            <Link
              href="/classes"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                sidebarOpen ? "" : "justify-center"
              )}
              style={{
                background: pathname.startsWith("/classes") ? "color-mix(in oklch, var(--color-primary-500) 12%, transparent)" : "transparent",
                color: pathname.startsWith("/classes") ? "var(--color-primary-500)" : "var(--text-secondary)",
              }}
              title={!sidebarOpen ? (isDosen ? "Kelas Kuliah" : "Kelas Saya") : undefined}
            >
              <BookOpen size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>{isDosen ? "Kelas Kuliah" : "Kelas Saya"}</span>}
            </Link>
          </div>
        </nav>
      </div>

      {/* Human-in-the-Loop Footer Card */}
      {sidebarOpen && (
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div
            className="p-2.5 rounded-xl border flex flex-col gap-1"
            style={{ background: "var(--surface-muted)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} style={{ color: "var(--color-ai-500)" }} />
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
                Human-in-the-Loop
              </span>
            </div>
            <p className="text-[10px] leading-tight" style={{ color: "var(--text-muted)" }}>
              Keputusan akhir penilaian 100% tervalidasi dosen pengajar.
            </p>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border flex items-center justify-center transition-colors hover:opacity-80 z-20 shadow-sm"
        style={{ background: "var(--surface-elevated)", borderColor: "var(--border)", color: "var(--text-muted)" }}
        aria-label={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
      >
        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </aside>
  );
}
