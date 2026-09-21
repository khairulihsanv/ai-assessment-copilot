"use client";

import { signOut } from "next-auth/react";
import { Sun, Moon, LogOut, Menu } from "lucide-react";
import { useThemeStore } from "@/stores/theme-store";
import { useUIStore } from "@/stores/ui-store";
import { getInitials } from "@/lib/utils";

interface TopbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function DashboardTopbar({ user }: TopbarProps) {
  const { resolvedTheme, setTheme } = useThemeStore();
  const { toggleSidebar } = useUIStore();
  const isDosen = user.role === "DOSEN";

  return (
    <header
      className="h-16 flex items-center justify-between px-6 border-b z-30"
      style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}
    >
      {/* Left: Mobile menu & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="font-display text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Dexa Assessment
          </span>
          <span style={{ color: "var(--border-strong)" }}>/</span>
          <span
            className="text-xs font-mono font-medium px-2 py-0.5 rounded-full"
            style={{
              background: "var(--surface-muted)",
              color: isDosen ? "var(--color-primary-600)" : "var(--color-secondary-600)",
              border: "1px solid var(--border)",
            }}
          >
            {isDosen ? "Faculty Suite" : "Student Portal"}
          </span>
        </div>
      </div>

      {/* Right: Telemetry & User Controls */}
      <div className="flex items-center gap-3">
        {/* Active AI Telemetry Pill */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium"
          style={{ background: "var(--surface-muted)", border: "1px solid var(--border)" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          <span style={{ color: "var(--text-secondary)" }}>AI Assistant: Ready</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg transition-all duration-200 hover:opacity-80 border"
          style={{ color: "var(--text-secondary)", background: "var(--surface)", borderColor: "var(--border)" }}
          aria-label={resolvedTheme === "dark" ? "Mode terang" : "Mode gelap"}
          title={resolvedTheme === "dark" ? "Mode terang" : "Mode gelap"}
        >
          {resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* User menu */}
        <div className="flex items-center gap-3 pl-3 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium leading-tight" style={{ color: "var(--text-primary)" }}>
              {user.name}
            </div>
            <div className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
              {isDosen ? "Dosen Pengampu" : "Mahasiswa"}
            </div>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
            style={{ background: "var(--color-primary-500)" }}
          >
            {getInitials(user.name)}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
            aria-label="Keluar"
            title="Keluar"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
