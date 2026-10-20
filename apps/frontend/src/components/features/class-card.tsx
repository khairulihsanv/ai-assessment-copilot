"use client";

import { ArrowUpRight, BookOpen, Check, Copy, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const tone = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
  return (
    <article className={`course-card course-tone-${tone}`}>
      <Link href={`/classes/${id}`} className="course-cover" aria-label={`Buka kelas ${name}`}>
        <span className="course-subject">{subject || "MATA KULIAH"}</span>
        <BookOpen size={42} strokeWidth={1.3} aria-hidden="true" />
        <span className="course-cover-arrow">
          <ArrowUpRight size={19} />
        </span>
      </Link>
      <div className="course-body">
        <h3>
          <Link href={`/classes/${id}`}>{name}</Link>
        </h3>
        <p className="line-clamp-2">
          {description ||
            (dosenName
              ? `Dosen: ${dosenName}`
              : "Tugas, diskusi, dan perkembangan kelas dalam satu tempat.")}
        </p>
        <div className="course-meta">
          <Users size={14} />
          <span>{isDosen ? `${studentCount} mahasiswa` : dosenName || "Anda terdaftar"}</span>
        </div>
      </div>
      <footer className="course-footer">
        {isDosen && enrollmentKey ? (
          <div>
            <button
              type="button"
              aria-label={`Salin kode kelas ${name}`}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(enrollmentKey);
                  setCopyState("copied");
                } catch {
                  setCopyState("error");
                }
              }}
              className="course-copy"
            >
              <span>{enrollmentKey}</span>
              {copyState === "copied" ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <span role="status" className="block text-[11px] text-muted-foreground">
              {copyState === "error"
                ? "Gagal menyalin. Salin kode secara manual."
                : copyState === "copied"
                  ? "Kode disalin"
                  : "Kode kelas"}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Ruang belajar Anda</span>
        )}
        <Link href={`/classes/${id}/assignments`} className="course-open">
          Lihat tugas <ArrowUpRight size={15} />
        </Link>
      </footer>
    </article>
  );
}
