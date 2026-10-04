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

  const [copyError, setCopyError] = useState(false);
  const handleCopyKey = async () => {
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
  return (
    <article className="group grid gap-4 border-b border-border bg-card px-5 py-6 last:border-b-0 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center">
      <div className="hidden h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted text-primary sm:flex">
        <BookOpen size={21} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{subject || "Mata kuliah"}</p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">
          <Link
            href={`/classes/${id}`}
            className="hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {name}
          </Link>
        </h3>
        {description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
        )}
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Users size={14} />
          {isDosen ? `${studentCount} mahasiswa` : `Dosen: ${dosenName || "Pengajar"}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
        {isDosen && enrollmentKey && (
          <>
            <button
              type="button"
              onClick={handleCopyKey}
              title="Salin kode kelas"
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs hover:bg-muted"
            >
              <Key size={13} />
              <span className="font-mono">{enrollmentKey}</span>
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            <span role="status" className="text-xs text-muted-foreground">
              {copyError
                ? "Gagal menyalin. Salin kode secara manual."
                : copied
                  ? "Kode disalin"
                  : ""}
            </span>
          </>
        )}
        <Link
          href={`/classes/${id}`}
          className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-primary hover:bg-muted"
        >
          Buka kelas
          <ChevronRight size={15} />
        </Link>
      </div>
    </article>
  );
}
