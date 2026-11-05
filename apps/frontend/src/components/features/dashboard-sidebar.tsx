"use client";

import {
  Award,
  BarChart3,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  House,
  ListChecks,
  LogOut,
  type LucideIcon,
  Settings,
} from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { OwlMark } from "@/components/owl-mark";
import { cn, getInitials } from "@/shared/utils";
import styles from "./workspace-navigation.module.css";

export interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

type NavItem = { href: string; label: string; icon: LucideIcon };

const COMMON_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: House },
  { href: "/classes", label: "Kelas", icon: GraduationCap },
  { href: "/assignments", label: "Tugas", icon: ClipboardList },
];
const LECTURER_ITEMS: NavItem[] = [
  { href: "/grading", label: "Koreksi", icon: CheckSquare },
  { href: "/rubrics", label: "Rubrik", icon: ListChecks },
  { href: "/analytics", label: "Analitik", icon: BarChart3 },
];
const STUDENT_ITEMS: NavItem[] = [{ href: "/grades", label: "Nilai", icon: Award }];

function navItems(role: string): NavItem[] {
  return [...COMMON_ITEMS, ...(role === "DOSEN" ? LECTURER_ITEMS : STUDENT_ITEMS)];
}

/** Marks the clicked link at once, before the next page has arrived. */
function NavLabel({ label, hidden }: { label: string; hidden?: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span data-pending={pending || undefined} className={cn(!hidden && styles.linkLabel)}>
      {hidden ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}

function NavEntry({
  item,
  active,
  onNavigate,
  className,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      <Icon size={19} aria-hidden="true" />
      <NavLabel label={item.label} />
    </Link>
  );
}

export function WorkspaceBrand({
  user,
  onNavigate,
}: {
  user: WorkspaceUser;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className={styles.brand}
      aria-label="Dexa Assessment — Beranda"
    >
      <OwlMark size={34} />
      <span className={styles.brandText}>
        <span className={styles.brandName}>dexa</span>
        <span className={styles.brandRole}>
          {user.role === "DOSEN" ? "Ruang kerja dosen" : "Ruang belajar"}
        </span>
      </span>
    </Link>
  );
}

/** Full list with labels, for the phone and tablet drawer. */
export function WorkspaceNavigation({
  user,
  onNavigate,
}: {
  user: WorkspaceUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" className={styles.navigation}>
      <ul className={styles.navList}>
        {navItems(user.role).map((item) => (
          <li key={item.href}>
            <NavEntry
              item={item}
              active={isActive(pathname, item.href)}
              onNavigate={onNavigate}
              className={styles.navLink}
            />
          </li>
        ))}
      </ul>
      <div className={styles.navDivider} />
      <NavEntry
        item={{ href: "/settings", label: "Pengaturan", icon: Settings }}
        active={pathname === "/settings"}
        onNavigate={onNavigate}
        className={styles.navLink}
      />
    </nav>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function useLogout() {
  const [leaving, setLeaving] = useState(false);
  const logout = async () => {
    if (leaving) return;
    setLeaving(true);
    sessionStorage.removeItem("dexa_session_active");
    localStorage.removeItem("dexa_remember_me");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The frontend logout route clears its cookie even if the backend cannot be reached.
    }
    window.location.assign("/login");
  };
  return { leaving, logout };
}

export function LogoutButton({ className }: { className?: string }) {
  const { leaving, logout } = useLogout();
  return (
    <button
      type="button"
      onClick={logout}
      disabled={leaving}
      className={cn(styles.logoutButton, className)}
      title="Keluar dari akun"
      aria-label="Keluar dari akun"
    >
      <LogOut size={18} aria-hidden="true" />
    </button>
  );
}

export function WorkspaceAccount({ user }: { user: WorkspaceUser }) {
  return (
    <div className={styles.account}>
      <span className={styles.accountAvatar} aria-hidden="true">
        {getInitials(user.name)}
      </span>
      <div className={styles.accountIdentity}>
        <p title={user.name}>{user.name}</p>
        <span>{user.role === "DOSEN" ? "Dosen" : "Mahasiswa"}</span>
      </div>
      <LogoutButton />
    </div>
  );
}

/** Icon rail on the left of the frame, the same for every role. */
export function DashboardSidebar({ user }: { user: WorkspaceUser }) {
  const pathname = usePathname();
  return (
    <aside className={styles.rail} data-workspace-sidebar aria-label="Menu ruang kerja">
      <Link href="/dashboard" className={styles.railBrand} aria-label="Dexa Assessment — Beranda">
        <OwlMark size={38} />
      </Link>
      <nav aria-label="Navigasi utama" className={styles.railNav}>
        {navItems(user.role).map((item) => (
          <NavEntry
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            className={styles.railLink}
          />
        ))}
      </nav>
      <div className={styles.railFooter}>
        <NavEntry
          item={{ href: "/settings", label: "Pengaturan", icon: Settings }}
          active={pathname === "/settings"}
          className={styles.railLink}
        />
        <LogoutButton />
      </div>
    </aside>
  );
}
