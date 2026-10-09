"use client";
import Link from "next/link";
import { Calendar, Download, FileText, RefreshCw, ArrowRight } from "lucide-react";
function Unavailable({ label, icon: Icon = FileText }: { label: string; icon?: typeof FileText }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-muted-foreground">
      <Icon size={16} className="shrink-0" />
      <div className="min-w-0">
        <span className="block text-xs font-medium">{label}</span>
        <span className="mt-0.5 block text-[11px]">Belum tersedia</span>
      </div>
    </div>
  );
}
export function SyncSiakadButton() {
  return <Unavailable label="Sinkronisasi SIAKAD — belum terhubung" icon={RefreshCw} />;
}
export function DosenQuickActionGroup() {
  return (
    <div className="space-y-2">
      <Link
        href="/analytics"
        className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
      >
        <span>Rekap nilai</span>
        <ArrowRight size={15} />
      </Link>
      <Link
        href="/rubrics"
        className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
      >
        <span>Acuan & rubrik</span>
        <ArrowRight size={15} />
      </Link>
      <Unavailable label="Ekspor rekap nilai (CSV)" icon={Download} />
      <Unavailable label="Rekap BAP perkuliahan" />
      <Unavailable label="Pengumuman ke mahasiswa" />
    </div>
  );
}
export function JadwalKuliahButton() {
  return <Unavailable label="Jadwal perkuliahan" icon={Calendar} />;
}
export function ExportAnalyticsButton() {
  return <Unavailable label="Ekspor laporan analitik (CSV)" icon={Download} />;
}
export function ExportTranscriptButton() {
  return <Unavailable label="Unduh rekap transkrip (PDF)" icon={Download} />;
}
