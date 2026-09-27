"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Users, Key, Copy, Check, ChevronRight } from "lucide-react";

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

  const handleCopyKey = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!enrollmentKey) return;
    navigator.clipboard.writeText(enrollmentKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group rounded-3xl bg-white border border-[#E5E7EB] hover:border-[#1E4D3B]/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between p-6">
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#E2EFE9] text-[#1E4D3B] font-mono text-xs font-bold">
            {subject || "SV-UNS TI"}
          </span>

          {isDosen && enrollmentKey && (
            <button
              onClick={handleCopyKey}
              type="button"
              title="Salin Kode Kelas"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] transition-colors border border-[#E5E7EB] cursor-pointer"
            >
              <Key size={13} className="text-[#6B7280]" />
              <span>{enrollmentKey}</span>
              {copied ? (
                <Check size={13} className="text-emerald-600" />
              ) : (
                <Copy size={13} className="text-[#9CA3AF] group-hover:text-[#374151]" />
              )}
            </button>
          )}
        </div>

        <h3 className="text-lg font-extrabold mt-3.5 font-display text-[#111827] line-clamp-1 group-hover:text-[#1E4D3B] transition-colors">
          <Link href={`/classes/${id}`} className="focus:outline-none">
            {name}
          </Link>
        </h3>

        {description && (
          <p className="line-clamp-2 text-xs text-[#6B7280] mt-1.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-[#F3F4F6] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[#4B5563]">
          {isDosen ? (
            <div className="flex items-center gap-1.5 font-medium">
              <Users size={15} className="text-[#1E4D3B]" />
              <span>{studentCount} Mahasiswa</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-medium">
              <BookOpen size={15} className="text-[#F59E0B]" />
              <span>Dosen: {dosenName || "Pengajar"}</span>
            </div>
          )}
        </div>

        <Link
          href={`/classes/${id}`}
          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#F3F4F6] group-hover:bg-[#1E4D3B] group-hover:text-white text-[#111827] font-bold text-xs transition-all"
        >
          <span>Buka Kelas</span>
          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
