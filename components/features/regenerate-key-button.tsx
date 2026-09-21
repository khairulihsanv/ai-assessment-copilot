"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Key, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    if (!confirm("Apakah Anda yakin ingin membuat kode kelas baru? Mahasiswa yang belum mendaftar tidak akan bisa memakai kode lama.")) {
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
    <div className="flex items-center gap-2 bg-muted/60 p-2 rounded-xl border border-border/80">
      <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-lg border border-border">
        <Key className="w-4 h-4 text-primary" />
        <span className="font-mono text-base font-bold tracking-wider text-foreground">
          {currentKey}
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        title="Salin Kode Kelas"
        className="h-9 px-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-emerald-500 font-medium">Tersalin</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>Salin</span>
          </>
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleRegenerate}
        disabled={loading}
        title="Acak Ulang Kode"
        className="h-9 px-2 text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
