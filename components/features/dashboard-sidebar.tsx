"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Sparkles,
  CheckSquare,
  BarChart3,
  Settings,
  BookMarked,
  Award,
  Bot,
  ShieldCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { signOut } from "next-auth/react";

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

  const handleLogout = async () => {
    sessionStorage.removeItem("dexa_session_active");
    localStorage.removeItem("dexa_remember_me");
    await signOut({ callbackUrl: "/login" });
  };

  const dosenNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/classes", label: "Kelas Kuliah", icon: GraduationCap },
    { href: "/assignments", label: "Tugas & Penugasan", icon: ClipboardList },
    { href: "/grading", label: "Koreksi & Asesmen AI", icon: Sparkles },
    { href: "/rubrics", label: "Rubrik Penilaian", icon: CheckSquare },
    { href: "/analytics", label: "Laporan & Analitik", icon: BarChart3 },
    { href: "/settings", label: "Pengaturan Akun", icon: Settings },
  ];

  const mhsNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/classes", label: "Kelas Kuliah", icon: GraduationCap },
    { href: "/assignments", label: "Tugas & Evaluasi", icon: ClipboardList },
    { href: "/grades", label: "Riwayat Nilai", icon: Award },
    { href: "/copilot", label: "AI Study Copilot", icon: Bot },
    { href: "/settings", label: "Pengaturan", icon: Settings },
  ];

  const navItems = isDosen ? dosenNav : mhsNav;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-white border-r border-[#e5e7eb] transition-all duration-300 relative justify-between z-30 select-none",
        sidebarOpen ? "w-64" : "w-[76px]"
      )}
    >
      <div className="flex flex-col flex-1 overflow-hidden py-5">
        {/* Brand Logo (Dexa Assessment) */}
        <div className={cn("flex items-center px-4 mb-6", sidebarOpen ? "gap-3" : "justify-center")}>
          <Link
            href="/dashboard"
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs hover:scale-105 transition-transform flex-shrink-0 group overflow-hidden"
            title="Dexa Assessment"
          >
            <img
              src="/dexa-logo.png"
              alt="Dexa Assessment"
              className="w-full h-full object-contain rounded-xl"
            />
          </Link>

          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-display text-[15px] font-extrabold text-[#111827] truncate leading-tight tracking-tight">
                Dexa Assessment
              </span>
              <span className="text-[10px] font-mono text-[#1E4D3B] font-bold truncate uppercase tracking-widest mt-0.5">
                Evaluation Hub
              </span>
            </div>
          )}
        </div>

        {/* Navigation Items (Dribbble icon dock style with peach/coral radial glow) */}
        <nav className="flex-1 px-3 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center rounded-2xl text-[13px] font-medium transition-all duration-200 group",
                  sidebarOpen ? "px-3.5 py-3 gap-3.5" : "w-12 h-12 justify-center mx-auto",
                  isActive
                    ? "text-[#1E4D3B] font-bold bg-[#E2EFE9]"
                    : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                {/* Active peach glow effect from Gapsy Studio */}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-2xl bg-[#FFA07A]/25 blur-md -z-10 pointer-events-none"
                    aria-hidden="true"
                  />
                )}

                <Icon
                  size={20}
                  className={cn(
                    "flex-shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-[#1E4D3B]" : "text-[#6B7280]"
                  )}
                />

                {sidebarOpen && <span className="truncate">{item.label}</span>}

                {/* Floating tooltip when collapsed */}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#111827] text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-[#f1f5f9] flex flex-col gap-2">
        {sidebarOpen ? (
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#111827] truncate">{user.name}</span>
              <span className="text-[10px] text-[#6B7280] truncate">{isDosen ? "Dosen UNS" : "Mahasiswa"}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
              title="Keluar dari Akun"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-xl text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] flex items-center justify-center transition-colors cursor-pointer"
              title="Keluar dari Akun"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}

        {/* Toggle Collapse Button */}
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center text-[#6B7280] hover:text-[#1E4D3B] hover:scale-105 shadow-xs transition-all mx-auto mt-1 cursor-pointer"
          aria-label={sidebarOpen ? "Ciutkan sidebar" : "Perluas sidebar"}
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
    </aside>
  );
}
