"use client";

import { signOut } from "next-auth/react";
import { LogOut, Menu, Search, Bell, Sparkles } from "lucide-react";
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
  const { toggleSidebar } = useUIStore();
  const isDosen = user.role === "DOSEN";

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

        {/* User Profile Avatar in Forest Green */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-11 h-11 rounded-full bg-[#1E4D3B] text-white flex items-center justify-center text-sm font-bold shadow-xs ring-2 ring-white select-none"
            title={`${user.name} (${isDosen ? "Dosen" : "Mahasiswa"})`}
          >
            {getInitials(user.name)}
          </div>
        </div>
      </div>
    </header>
  );
}
