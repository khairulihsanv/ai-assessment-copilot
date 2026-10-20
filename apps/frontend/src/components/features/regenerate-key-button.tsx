"use client";

import { Check, Copy, Key, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
        "Apakah Anda yakin ingin membuat kode kelas baru? Mahasiswa yang belum mendaftar tidak akan bisa memakai kode lama.",
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
    <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border border-border">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-xl border border-border shadow-none">
        <Key className="w-4 h-4 text-primary" />
        <span
          id="classEnrollmentKey"
          className="font-mono text-sm font-semibold tracking-wider text-foreground"
        >
          {currentKey}
        </span>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        title="Salin Kode Kelas"
        className="h-9 px-3 rounded-xl border border-border bg-card hover:bg-secondary flex items-center gap-1.5 text-xs text-foreground hover:text-secondary-foreground font-bold transition shadow-none cursor-pointer"
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
        className="h-9 w-9 rounded-xl border border-border bg-card hover:bg-rose-50 flex items-center justify-center text-muted-foreground hover:text-rose-600 transition shadow-none cursor-pointer disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
