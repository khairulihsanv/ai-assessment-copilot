"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Key, Copy, Check } from "lucide-react";

interface RegenerateKeyButtonProps {
  classId: string;
  initialKey: string;
}

export function RegenerateKeyButton({ classId, initialKey }: RegenerateKeyButtonProps) {
  const router = useRouter();
  const [currentKey, setCurrentKey] = useState(initialKey);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (
      !confirm(
        "Apakah Anda yakin ingin membuat kode kelas baru? Mahasiswa yang belum mendaftar tidak akan bisa memakai kode lama."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/classes/${classId}/regenerate-key`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.enrollmentKey) {
        setCurrentKey(data.enrollmentKey);
        router.refresh();
      } else {
        alert(data.error || "Gagal memperbarui kode kelas");
      }
    } catch {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-[#F9FAFB] p-2 rounded-2xl border border-[#E5E7EB]">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-[#E5E7EB] shadow-2xs">
        <Key className="w-4 h-4 text-[#1E4D3B]" />
        <span className="font-mono text-sm font-extrabold tracking-wider text-[#111827]">
          {currentKey}
        </span>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        title="Salin Kode Kelas"
        className="h-9 px-3 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#E2EFE9] flex items-center gap-1.5 text-xs text-[#374151] hover:text-[#1E4D3B] font-bold transition shadow-2xs cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-700">Tersalin</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Salin</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleRegenerate}
        disabled={loading}
        title="Acak Ulang Kode"
        className="h-9 w-9 rounded-xl border border-[#E5E7EB] bg-white hover:bg-rose-50 flex items-center justify-center text-[#6B7280] hover:text-rose-600 transition shadow-2xs cursor-pointer disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
