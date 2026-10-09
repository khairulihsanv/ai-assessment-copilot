"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  CheckSquare,
  BarChart3,
  Settings,
  Award,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  GraduationCap,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { signOut } from "next-auth/react";
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
    { href: "/classes", label: "Kelas", icon: GraduationCap },
    { href: "/assignments", label: "Tugas", icon: ClipboardList },
    ...(user.role === "DOSEN"
      ? [
          { href: "/grading", label: "Koreksi", icon: ListChecks },
          { href: "/rubrics", label: "Rubrik penilaian", icon: CheckSquare },
          { href: "/analytics", label: "Laporan", icon: BarChart3 },
        ]
      : [
          { href: "/grades", label: "Nilai saya", icon: Award },
          { href: "/copilot", label: "Study Copilot", icon: Bot },
        ]),
  ];
  return (
    <nav aria-label="Navigasi utama" className="space-y-1 px-3">
      {!compact && (
        <p className="px-3 pb-3 pt-2 text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
          Ruang kerja
        </p>
      )}
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={compact ? label : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
              compact && "justify-center",
              active
                ? "bg-secondary font-semibold text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon size={18} />
            {!compact && label}
            {compact && <span className="sr-only">{label}</span>}
          </Link>
        );
      })}
      <div className="my-5 border-t" />
      <Link
        href="/settings"
        onClick={onNavigate}
        title={compact ? "Pengaturan" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted",
          compact && "justify-center",
        )}
      >
        <Settings size={18} />
        {!compact && "Pengaturan"}
        {compact && <span className="sr-only">Pengaturan</span>}
      </Link>
    </nav>
  );
}
export function DashboardSidebar({ user }: { user: WorkspaceUser }) {
  const { sidebarOpen, toggleSidebar } = useUIStore();
<<<<<<< HEAD
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

=======
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card md:flex",
        sidebarOpen ? "w-[232px]" : "w-[72px]",
      )}
    >
<<<<<<< HEAD
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
=======
      <Link
        href="/dashboard"
        className={cn("flex h-20 items-center gap-3 px-6", !sidebarOpen && "justify-center px-0")}
        aria-label="Dexa Assessment — Ringkasan"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
          d.
        </span>
        {sidebarOpen && (
          <span>
            <span className="dexa-wordmark leading-none">
              dexa<span className="text-primary">.</span>
            </span>
            <span className="block text-[11px] tracking-wide text-muted-foreground">
              ASSESSMENT
            </span>
          </span>
        )}
      </Link>
      <div className="flex-1 overflow-y-auto pt-5">
        <WorkspaceNavigation user={user} compact={!sidebarOpen} />
      </div>
      <div className="border-t p-3">
        {sidebarOpen && (
          <div className="mb-3 rounded-lg bg-muted px-3 py-3">
            <p className="text-xs font-medium">Keputusan tetap di dosen.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Saran AI adalah bahan tinjauan, bukan nilai akhir.
            </p>
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          {sidebarOpen && (
            <div className="min-w-0 pl-2">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {user.role === "DOSEN" ? "Dosen" : "Mahasiswa"}
              </p>
            </div>
          )}
          <button
            type="button"
            aria-label="Keluar dari akun"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <LogOut size={17} />
          </button>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Ringkas navigasi" : "Perluas navigasi"}
          className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs text-muted-foreground hover:bg-muted"
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}{" "}
          {sidebarOpen && "Ringkas navigasi"}
        </button>
      </div>
    </aside>
  );
}
