"use client";
import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sun, Moon, ChevronRight, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useThemeStore } from "@/stores/theme-store";
import { getInitials } from "@/lib/utils";
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
}
