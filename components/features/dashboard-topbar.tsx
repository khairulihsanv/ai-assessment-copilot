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

  return (
    <header
      className="h-16 flex items-center justify-between px-6 border-b"
      style={{ background: "var(--surface-elevated)", borderColor: "var(--border)" }}
    >
      {/* Mobile menu */}
      <button
        onClick={toggleSidebar}
        className="md:hidden p-2 rounded-lg transition-colors"
        style={{ color: "var(--text-secondary)" }}
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb area (placeholder) */}
      <div className="hidden md:block" />

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg transition-all duration-200 hover:opacity-80"
          style={{ color: "var(--text-secondary)", background: "var(--surface-muted)" }}
          aria-label={resolvedTheme === "dark" ? "Mode terang" : "Mode gelap"}
        >
          {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User menu */}
        <div className="flex items-center gap-3 pl-3 border-l" style={{ borderColor: "var(--border)" }}>
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {user.name}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {user.role === "DOSEN" ? "Dosen" : "Mahasiswa"}
            </div>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
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
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
