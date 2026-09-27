"use client";

import { useState } from "react";
import { RefreshCw, Download, FileText, Calendar, ChevronRight } from "lucide-react";

export function SyncSiakadButton() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      alert("Sinkronisasi SIAKAD UNS Berhasil: 100% Data Mahasiswa, Kelas, & Nilai Terkini.");
    }, 800);
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={syncing}
      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white text-[#006398] border border-[#dce9ff] text-xs font-mono font-semibold hover:bg-[#eff4ff] shadow-xs transition cursor-pointer disabled:opacity-60"
      title="Sinkronisasi SIAKAD UNS"
    >
      <RefreshCw size={14} className={`text-[#006398] ${syncing ? "animate-spin" : ""}`} />
      <span>{syncing ? "Sinkron..." : "Sync SIAKAD"}</span>
    </button>
  );
}

export function DosenQuickActionGroup() {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => alert("Ekspor Rekap Nilai CSV: File nilai mahasiswa seluruh kelas sedang diunduh.")}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-[#f8f9ff] hover:bg-[#eff4ff] border border-[#e2e8f0] text-xs font-semibold text-[#0b1c30] transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          <Download size={15} className="text-[#004ac6]" />
          <span>Ekspor Rekap Nilai (CSV)</span>
        </div>
        <ChevronRight size={14} className="text-[#737686]" />
      </button>

      <button
        type="button"
        onClick={() => alert("Rekap BAP Perkuliahan UNS: Berita Acara Perkuliahan Semester Genap 2024/2025 disiapkan.")}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-[#f8f9ff] hover:bg-[#eff4ff] border border-[#e2e8f0] text-xs font-semibold text-[#0b1c30] transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          <FileText size={15} className="text-[#006398]" />
          <span>Unduh Rekap BAP Perkuliahan</span>
        </div>
        <ChevronRight size={14} className="text-[#737686]" />
      </button>

      <button
        type="button"
        onClick={() => alert("Broadcast Akademik: Pesan pengumuman dikirimkan ke seluruh mahasiswa kelas aktif.")}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-[#f8f9ff] hover:bg-[#eff4ff] border border-[#e2e8f0] text-xs font-semibold text-[#0b1c30] transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          <Calendar size={15} className="text-[#6a1edb]" />
          <span>Kirim Broadcast ke Mahasiswa</span>
        </div>
        <ChevronRight size={14} className="text-[#737686]" />
      </button>
    </div>
  );
}

export function JadwalKuliahButton() {
  return (
    <button
      type="button"
      onClick={() => alert("Jadwal Kuliah Pekan Ini: CS 304 (Senin 08:00 WIB), DS 105 (Rabu 10:00 WIB), Lab Komputasi Vokasi.")}
      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#eff4ff] text-[#0b1c30] border border-[#dce9ff] text-xs font-semibold hover:bg-[#dbe1ff]/40 transition cursor-pointer"
    >
      <Calendar size={15} className="text-[#006398]" />
      <span>Jadwal Kuliah</span>
    </button>
  );
}

export function ExportAnalyticsButton() {
  return (
    <button
      type="button"
      onClick={() => alert("Ekspor Laporan Analitik: Mengunduh ringkasan OBE dan distribusi nilai CSV.")}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#dce9ff] text-xs font-bold text-[#004ac6] hover:bg-[#eff4ff] transition shadow-xs cursor-pointer"
    >
      <Download size={14} />
      <span>Ekspor Laporan Lengkap (CSV)</span>
    </button>
  );
}

export function ExportTranscriptButton() {
  return (
    <button
      type="button"
      onClick={() => alert("Transkrip Akademik: Menyiapkan dokumen transkrip resmi format PDF.")}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#dce9ff] text-xs font-bold text-[#004ac6] hover:bg-[#eff4ff] transition shadow-xs cursor-pointer"
    >
      <Download size={14} />
      <span>Unduh Rekap Transkrip PDF</span>
    </button>
  );
}
