"use client";

import { ArrowRight, FileText, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn, formatRelativeTime } from "@/shared/utils";

export interface GradingRow {
  id: string;
  createdAt: string;
  hasDraft?: boolean;
  released?: { finalScore: number } | null;
  user: { name: string; email: string };
  assignment: {
    id: string;
    title: string;
    classId: string;
    maxScore: number;
    class: { name: string };
  };
}

type StatusFilter = "pending" | "released" | "all";

const FILTER_LABELS: Record<StatusFilter, string> = {
  pending: "Menunggu",
  released: "Dirilis",
  all: "Semua",
};

/** The one place to find any submission: search by name or task, narrow by class and status. */
export function GradingList({ rows }: { rows: GradingRow[] }) {
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("pending");

  const classes = useMemo(
    () => Array.from(new Map(rows.map((r) => [r.assignment.classId, r.assignment.class.name]))),
    [rows],
  );
  const counts: Record<StatusFilter, number> = {
    pending: rows.filter((r) => !r.released).length,
    released: rows.filter((r) => r.released).length,
    all: rows.length,
  };

  const query = search.trim().toLocaleLowerCase("id-ID");
  const visible = rows.filter(
    (r) =>
      (status === "all" || (status === "released") === Boolean(r.released)) &&
      (!classId || r.assignment.classId === classId) &&
      `${r.user.name} ${r.user.email} ${r.assignment.title} ${r.assignment.class.name}`
        .toLocaleLowerCase("id-ID")
        .includes(query),
  );
  const filtered = Boolean(query || classId);

  if (rows.length === 0) {
    return (
      <section className="rounded-3xl bg-card px-6 py-14 text-center">
        <FileText className="mx-auto mb-3 text-primary" size={28} aria-hidden="true" />
        <h2 className="text-lg">Belum ada jawaban untuk dikoreksi</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          Pengumpulan mahasiswa akan muncul di sini. Siapkan tugas dan rubrik terlebih dahulu.
        </p>
        <Link
          href="/assignments"
          className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          Kelola tugas
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-0 flex-[1_1_240px]">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="grading-search" className="sr-only">
            Cari mahasiswa atau tugas
          </label>
          <input
            id="grading-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari mahasiswa atau tugas…"
            className="min-h-11 w-full rounded-full border border-input bg-card pr-4 pl-10 text-sm"
          />
        </div>
        <label htmlFor="grading-class" className="sr-only">
          Filter kelas
        </label>
        <select
          id="grading-class"
          value={classId}
          onChange={(event) => setClassId(event.target.value)}
          className="min-h-11 max-w-full rounded-full border border-input bg-card px-4 text-sm font-semibold"
        >
          <option value="">Semua kelas</option>
          {classes.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <fieldset className="flex gap-1 rounded-full border-0 bg-muted p-1">
          <legend className="sr-only">Filter status</legend>
          {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={status === key}
              onClick={() => setStatus(key)}
              className={cn(
                "min-h-9 rounded-full px-3.5 text-[13px] font-bold whitespace-nowrap",
                status === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {FILTER_LABELS[key]} {counts[key]}
            </button>
          ))}
        </fieldset>
      </div>

      {visible.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {visible.map((r) => (
            <li key={r.id}>
              <Link
                href={`/classes/${r.assignment.classId}/assignments/${r.assignment.id}/submissions/${r.id}`}
                className="grid items-center gap-2 rounded-2xl bg-muted/60 p-3.5 hover:bg-muted sm:grid-cols-[1fr_1.2fr_auto] sm:gap-4"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{r.user.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {r.user.email}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.assignment.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {r.assignment.class.name} · {formatRelativeTime(r.createdAt).toLowerCase()}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap",
                      r.released
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-card text-muted-foreground",
                    )}
                  >
                    {r.released
                      ? `Dirilis · ${r.released.finalScore}/${r.assignment.maxScore}`
                      : r.hasDraft
                        ? "Draf AI siap"
                        : "Belum ada draf"}
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-primary" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div role="status" className="py-10 text-center">
          <h2 className="text-base">Tidak ada yang cocok</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered
              ? "Coba kata kunci atau kelas lain."
              : status === "pending"
                ? "Semua jawaban sudah dinilai."
                : "Belum ada nilai yang dirilis."}
          </p>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setClassId("");
              }}
              className="mt-3 min-h-11 rounded-full border border-input px-5 text-sm font-bold hover:bg-muted"
            >
              Hapus filter
            </button>
          )}
        </div>
      )}
    </section>
  );
}
