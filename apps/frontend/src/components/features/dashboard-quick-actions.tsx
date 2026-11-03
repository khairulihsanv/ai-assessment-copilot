"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

/*
 * Features that are not built yet render nothing instead of a disabled
 * "Belum tersedia" tile. The exports stay so existing pages keep compiling.
 */
export function SyncSiakadButton() {
  return null;
}
export function JadwalKuliahButton() {
  return null;
}
export function ExportAnalyticsButton() {
  return null;
}
export function ExportTranscriptButton() {
  return null;
}

export function DosenQuickActionGroup() {
  return (
    <div className="space-y-1">
      {[
        { href: "/grading", label: "Antrean koreksi" },
        { href: "/analytics", label: "Analitik penilaian" },
        { href: "/rubrics", label: "Rubrik" },
      ].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
        >
          <span>{item.label}</span>
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
