"use client";

import Link from "next/link";
import { useState } from "react";
import { Key, Copy, Check, MoreVertical, FolderOpen, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClassCardProps {
  id: string;
  name: string;
  subject?: string | null;
  description?: string | null;
  enrollmentKey?: string;
  studentCount?: number;
  dosenName?: string;
  isDosen: boolean;
}

// Helper to generate a consistent color based on string
const getBgColor = (str: string) => {
  const colors = [
    "bg-blue-600",
    "bg-indigo-600",
    "bg-purple-600",
    "bg-pink-600",
    "bg-rose-600",
    "bg-orange-600",
    "bg-green-700",
    "bg-teal-700",
    "bg-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export function ClassCard({
  id,
  name,
  subject,
  description,
  enrollmentKey,
  studentCount = 0,
  dosenName,
  isDosen,
}: ClassCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  
  const handleCopyKey = async (e: React.MouseEvent) => {
    e.preventDefault(); // prevent triggering the link overlay
    e.stopPropagation();
    if (!enrollmentKey) return;
    try {
      await navigator.clipboard.writeText(enrollmentKey);
      setCopyError(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };

  const bgColor = getBgColor(id);
  const avatarText = dosenName ? dosenName.charAt(0).toUpperCase() : (isDosen ? "M" : "D");

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md h-[280px]">
      {/* Header section */}
      <div className={`relative h-28 ${bgColor} p-4 text-white overflow-hidden`}>
        {/* Subtle pattern or gradient overlay could go here */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        
        <div className="relative flex justify-between items-start z-10">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="text-xl font-medium leading-tight truncate">
              <Link 
                href={`/classes/${id}`} 
                className="hover:underline focus-visible:outline-none after:absolute after:inset-0 after:z-0"
              >
                {name}
              </Link>
            </h3>
            <p className="mt-1 text-sm font-medium opacity-90 truncate">{subject || "Mata kuliah"}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 h-8 w-8 rounded-full z-10 shrink-0"
          >
            <MoreVertical size={18} />
          </Button>
        </div>
      </div>
      
      {/* Avatar (Absolute positioning overlapping header and body) */}
      <div className="absolute right-4 top-20 z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-card bg-slate-200 dark:bg-slate-700 text-2xl font-medium text-slate-700 dark:text-slate-200 shadow-sm">
        {avatarText}
      </div>

      {/* Body section */}
      <div className="flex flex-1 flex-col p-4 pt-10">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {isDosen ? dosenName : (dosenName ? `Dosen: ${dosenName}` : "")}
        </p>
        <p className="text-xs text-muted-foreground mt-auto flex items-center gap-1.5">
           <Users size={14} />
           {isDosen ? `${studentCount} mahasiswa` : "Terdaftar"}
        </p>
      </div>

      {/* Footer / Actions section */}
      <div className="border-t border-border/60 p-2 px-3 flex justify-between items-center bg-muted/10 relative z-10 min-h-[52px]">
        <div>
          {isDosen && enrollmentKey && (
            <button
              type="button"
              onClick={handleCopyKey}
              title="Salin kode kelas"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Key size={14} />
              <span className="font-mono">{enrollmentKey}</span>
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" title="Lihat tugas" className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">
            <TrendingUp size={18} />
          </Button>
          <Button variant="ghost" size="icon" title="Buka folder kelas" className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">
            <FolderOpen size={18} />
          </Button>
        </div>
      </div>
    </article>
  );
}
