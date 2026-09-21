"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface JoinClassModalProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function JoinClassModal({ onSuccess, trigger }: JoinClassModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentKey, setEnrollmentKey] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentKey: enrollmentKey.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal bergabung ke kelas");
      }

      setOpen(false);
      setEnrollmentKey("");
      router.push(`/classes/${data.classId}`);
      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 border-primary/40 text-primary hover:bg-primary/10">
            <LogIn className="w-4 h-4" />
            Gabung Kelas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-2">
              <KeyRound className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold font-display">Gabung ke Kelas</DialogTitle>
            <DialogDescription>
              Masukkan kode kelas (enrollment key) yang diberikan oleh dosen pengajar Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="p-3 text-sm rounded-lg bg-destructive/10 border border-destructive/20 text-destructive font-medium">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="keyInput">Kode Kelas (6-8 Karakter)</Label>
              <Input
                id="keyInput"
                placeholder="cth. 7G9K2M"
                value={enrollmentKey}
                onChange={(e) => setEnrollmentKey(e.target.value.toUpperCase())}
                className="font-mono text-center text-lg tracking-widest uppercase font-bold"
                maxLength={8}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground text-center">
                Minta kode pendaftaran 6-8 digit kepada dosen pengampu mata kuliah Anda.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading || !enrollmentKey.trim()} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Gabung Sekarang
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
