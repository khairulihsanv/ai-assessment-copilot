"use client";
import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sun, Moon, ChevronRight, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useThemeStore } from "@/stores/theme-store";
import { getInitials } from "@/lib/utils";
<<<<<<< HEAD

interface TopbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function DashboardTopbar({ user }: TopbarProps) {
  const { toggleSidebar } = useUIStore();
  const isDosen = user.role === "DOSEN";

  const handleLogout = async () => {
    sessionStorage.removeItem("dexa_session_active");
    localStorage.removeItem("dexa_remember_me");
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <header className="h-20 flex items-center justify-between px-6 sm:px-8 bg-[#F3F4F6]/95 backdrop-blur-md border-b border-[#E5E7EB]/50 sticky top-0 z-20 transition-all">
      {/* Left: Mobile trigger & Welcome Back Heading */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2.5 rounded-2xl bg-white border border-[#E5E7EB] text-[#4B5563] hover:bg-[#F3F4F6] transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[#9CA3AF] tracking-wide">
            Welcome back,
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight leading-tight">
            {user.name}
          </h2>
        </div>
      </div>

      {/* Right: Search pill + Notification + Avatar */}
      <div className="flex items-center gap-3.5">
        {/* Search Input Pill (Exact Gapsy Studio style) */}
        <div className="hidden sm:flex items-center relative w-64 md:w-80">
          <Search size={16} className="absolute left-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search courses, rubrics, students..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-[#E5E7EB] text-xs font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1E4D3B]/20 focus:border-[#1E4D3B] transition-all shadow-xs"
          />
        </div>

        {/* Circular Notification Bell with pink/red indicator */}
        <button
          className="w-11 h-11 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB] shadow-xs transition-all relative cursor-pointer"
          aria-label="Notifikasi"
          title="Notifikasi"
        >
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#FF4D4D] ring-2 ring-white" />
        </button>

        {/* User Profile Avatar in Forest Green + Logout Button */}
        <div className="flex items-center gap-2">
          <div
            className="w-11 h-11 rounded-full bg-[#1E4D3B] text-white flex items-center justify-center text-sm font-bold shadow-xs ring-2 ring-white select-none"
            title={`${user.name} (${isDosen ? "Dosen" : "Mahasiswa"})`}
          >
            {getInitials(user.name)}
          </div>
          <button
            onClick={handleLogout}
            className="w-11 h-11 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] shadow-xs transition-all cursor-pointer"
            aria-label="Keluar dari akun"
            title="Keluar dari akun"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
=======
import { WorkspaceNavigation, type WorkspaceUser } from "./dashboard-sidebar";
const labels: Record<string, string> = {
	dashboard: "Ringkasan",
	classes: "Kelas",
	assignments: "Tugas",
	grading: "Koreksi",
	rubrics: "Rubrik penilaian",
	analytics: "Laporan",
	grades: "Nilai saya",
	copilot: "Study Copilot",
	settings: "Pengaturan",
	calendar: "Kalender",
};
export function DashboardTopbar({ user }: { user: WorkspaceUser }) {
	const path = usePathname().split("/").filter(Boolean);
	const dialog = useRef<HTMLDialogElement>(null);
	const { resolvedTheme, setTheme } = useThemeStore();
	return (
		<>
			<header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-card px-4 sm:px-8">
				<div className="flex min-w-0 items-center gap-3">
					<button
						type="button"
						onClick={() => dialog.current?.showModal()}
						aria-label="Buka navigasi"
						className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted md:hidden"
					>
						<Menu size={20} />
					</button>
					<nav
						aria-label="Breadcrumb"
						className="flex min-w-0 items-center gap-2 text-sm"
					>
						<span className="hidden text-muted-foreground sm:inline">
							Ruang kerja
						</span>
						<ChevronRight
							size={14}
							className="hidden text-muted-foreground sm:block"
						/>
						<Link
							className="truncate font-medium hover:underline"
							href={`/${path[0] || "dashboard"}`}
						>
							{labels[path[0] || "dashboard"] || "Ruang kerja"}
						</Link>
						{path.length > 1 && (
							<>
								<ChevronRight size={14} className="text-muted-foreground" />
								<span className="text-muted-foreground">
									{path.includes("submissions")
										? "Tinjau jawaban"
										: path.includes("assignments")
											? "Detail tugas"
											: "Detail"}
								</span>
							</>
						)}
					</nav>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<button
						type="button"
						onClick={() =>
							setTheme(resolvedTheme === "dark" ? "light" : "dark")
						}
						aria-label={
							resolvedTheme === "dark"
								? "Gunakan tema terang"
								: "Gunakan tema gelap"
						}
						className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
					>
						{resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
					</button>
					<Link
						href="/settings"
						aria-label={`Pengaturan akun ${user.name}`}
						title={user.name}
						className="flex h-9 w-9 items-center justify-center rounded-lg border bg-secondary text-xs font-semibold text-secondary-foreground"
					>
						{getInitials(user.name)}
					</Link>
				</div>
			</header>
			<dialog
				ref={dialog}
				aria-label="Navigasi Dexa Assessment"
				className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(320px,88vw)] max-w-none border-r bg-card p-0 text-foreground"
			>
				<div className="flex h-20 items-center justify-between px-6">
					<Link
						href="/dashboard"
						onClick={() => dialog.current?.close()}
						className="dexa-wordmark"
					>
						dexa.
					</Link>
					<button
						type="button"
						onClick={() => dialog.current?.close()}
						aria-label="Tutup navigasi"
						className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"
					>
						<X size={20} />
					</button>
				</div>
				<WorkspaceNavigation
					user={user}
					onNavigate={() => dialog.current?.close()}
				/>
				<div className="mx-6 mt-8 border-t pt-5">
					<p className="font-medium">{user.name}</p>
					<p className="mt-1 text-sm text-muted-foreground">
						{user.role === "DOSEN" ? "Dosen" : "Mahasiswa"}
					</p>
					<button
						type="button"
						onClick={() => signOut({ callbackUrl: "/" })}
						className="mt-4 flex min-h-11 items-center gap-2 text-sm"
					>
						<LogOut size={16} />
						Keluar dari akun
					</button>
				</div>
			</dialog>
		</>
	);
>>>>>>> ae00f9107d7769e123788769c9123652bf66f60a
}
