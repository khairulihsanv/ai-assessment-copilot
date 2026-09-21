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

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/classes",
    label: "Kelas",
    icon: BookOpen,
  },
];

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r transition-all duration-300 relative",
        sidebarOpen ? "w-64" : "w-[72px]"
      )}
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--color-primary-500)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        {sidebarOpen && (
          <span className="font-display text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
            AI Assessment
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                sidebarOpen ? "" : "justify-center"
              )}
              style={{
                background: isActive ? "var(--sidebar-active)" : "transparent",
                color: isActive ? "var(--color-primary-500)" : "var(--text-secondary)",
              }}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* AI Badge */}
      {sidebarOpen && (
        <div className="mx-3 mb-4 p-3 rounded-xl" style={{ background: "color-mix(in oklch, var(--color-ai-100) 50%, var(--surface))" }}>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} style={{ color: "var(--color-ai-500)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--color-ai-700)" }}>AI Copilot Aktif</span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Penilaian AI siap membantu koreksi tugas
          </p>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full border flex items-center justify-center transition-colors hover:opacity-80"
        style={{ background: "var(--surface-elevated)", borderColor: "var(--border)", color: "var(--text-muted)" }}
        aria-label={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
      >
        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </aside>
  );
}
