"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getErrorMessage } from "@/shared/utils/api-error";

/** Compact "join with a class code" form for the student home page. */
export function JoinClassInline() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!key.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/classes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentKey: key.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(getErrorMessage(data, "Gagal bergabung ke kelas"));
      router.push(`/classes/${data.classId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <form onSubmit={submit} className="flex gap-1.5 rounded-full bg-muted p-1.5">
        <label htmlFor="join-class-code" className="sr-only">
          Kode kelas
        </label>
        <input
          id="join-class-code"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="Kode kelas baru"
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 rounded-full bg-transparent px-3.5 text-sm font-semibold placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          Gabung
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-left text-xs font-semibold text-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
}
