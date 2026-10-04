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
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card md:flex",
        sidebarOpen ? "w-[232px]" : "w-[72px]",
      )}
    >
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
