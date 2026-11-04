"use client";

import { ArrowRight, BookOpen, Check, FileText, Plus, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn, formatRelativeTime, getInitials } from "@/shared/utils";
import { ClassCover, pickByKey } from "./class-cover";
import styles from "./dosen-dashboard.module.css";

interface SubmissionItem {
  id: string;
  createdAt: string | Date;
  user: { name: string };
  assignment: { id: string; title: string; classId: string; class: { name: string } };
}

export interface DosenDashboardData {
  classes: Array<{
    id: string;
    name: string;
    subject: string | null;
    createdAt: string | Date;
    pending?: number;
    _count: { enrollments: number; assignments: number };
  }>;
  pending: number;
  released: number;
  queue: Array<SubmissionItem & { hasDraft?: boolean }>;
  recent?: Array<SubmissionItem & { released?: boolean }>;
}

const TILES = ["--tile-1", "--tile-2", "--tile-3", "--tile-4", "--tile-5"];

function reviewPath(item: SubmissionItem) {
  return `/classes/${item.assignment.classId}/assignments/${item.assignment.id}/submissions/${item.id}`;
}

/** Real availability of the model, so "siap" is never a decoration. */
function AIStatusNote() {
  const [status, setStatus] = useState<{
    ready?: boolean;
    model?: string;
    message?: string;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ ready: false, message: "Status AI tidak dapat dibaca." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-card p-3.5">
      <Sparkles size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 text-xs leading-relaxed text-muted-foreground" role="status">
        {!status && "Memeriksa layanan AI…"}
        {status?.ready && (
          <>
            <span className="font-bold text-foreground">Layanan AI siap.</span>{" "}
            <span className="break-words">Model {status.model}.</span>
          </>
        )}
        {status && !status.ready && (
          <>
            <span className="font-bold text-foreground">Layanan AI belum siap.</span>{" "}
            <span className="break-words">{status.message} Anda tetap bisa menilai manual.</span>
          </>
        )}
      </p>
    </div>
  );
}

export function DosenDashboard({
  name,
  data,
  greeting,
  unavailable = false,
}: {
  name: string;
  data: DosenDashboardData;
  greeting: string;
  unavailable?: boolean;
}) {
  const taskDialog = useRef<HTMLDialogElement>(null);
  const { classes, pending, released, queue, recent = [] } = data;

  return (
    <div className={styles.dashboard} data-dosen-dashboard>
      <div className={styles.main}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight lg:text-[32px]">
              {greeting}, {name}
            </h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {pending > 0
                ? `${pending} jawaban menunggu keputusan Anda. ${released} nilai sudah dirilis.`
                : `Tidak ada jawaban yang menunggu. ${released} nilai sudah dirilis.`}
            </p>
          </div>
          {!unavailable &&
            (classes.length > 1 ? (
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => taskDialog.current?.showModal()}
              >
                <Plus size={17} aria-hidden="true" />
                Buat tugas
              </button>
            ) : (
              <Link
                className={styles.primaryAction}
                href={classes[0] ? `/classes/${classes[0].id}/assignments/new` : "/classes"}
              >
                <Plus size={17} aria-hidden="true" />
                {classes[0] ? "Buat tugas" : "Buat kelas pertama"}
              </Link>
            ))}
        </header>

        {unavailable ? (
          <section role="alert" className="rounded-3xl bg-card p-6">
            <h2 className="text-lg">Beranda belum dapat dimuat</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Data kelas dan pengumpulan belum tersedia. Muat ulang halaman untuk mencoba kembali.
            </p>
            <a className={cn(styles.secondaryAction, "mt-4")} href="/dashboard">
              Muat ulang
            </a>
          </section>
        ) : (
          <>
            <section aria-labelledby="classes-heading">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="classes-heading" className="text-lg">
                  Kelas Anda
                </h2>
                <Link
                  href="/classes"
                  className="inline-flex items-center gap-1 text-sm font-bold text-primary"
                >
                  Kelola kelas
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
              {classes.length > 0 ? (
                <ul className={styles.shelf}>
                  {classes.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <Link href={`/classes/${item.id}`} className="block rounded-2xl">
                        <ClassCover id={item.id} name={item.name} />
                        <span className="mt-2 block text-[13px] font-bold">
                          {item.pending ? `${item.pending} perlu ditinjau` : "Tidak ada antrean"}
                        </span>
                        <span className="block text-xs font-medium text-muted-foreground">
                          {item._count.enrollments} mahasiswa · {item._count.assignments} tugas
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-3xl bg-card p-6">
                  <BookOpen size={24} className="text-primary" aria-hidden="true" />
                  <h3 className="mt-2 font-bold">Mulai dari kelas pertama Anda</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Buat kelas untuk membagikan tugas dan menerima jawaban mahasiswa.
                  </p>
                </div>
              )}
            </section>

            <section
              aria-labelledby="review-heading"
              className="flex flex-wrap gap-5 rounded-3xl bg-muted p-4 sm:p-6"
            >
              <div className="min-w-0 flex-[1_1_240px]">
                <h2 id="review-heading" className="text-xl leading-tight lg:text-2xl">
                  Antrean koreksi
                </h2>
                <p className="mt-2 text-sm leading-relaxed font-medium text-muted-foreground">
                  Draf AI bukan nilai. Mahasiswa baru melihat nilai setelah Anda merilisnya.
                </p>
                <Link href="/grading" className={cn(styles.primaryAction, "mt-4")}>
                  Buka semua koreksi
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <div className="min-w-0 flex-[1_1_300px]">
                {queue.length > 0 ? (
                  <ul className="space-y-2">
                    {queue.slice(0, 4).map((item) => (
                      <li key={item.id}>
                        <Link
                          href={reviewPath(item)}
                          className="flex items-center gap-3 rounded-2xl bg-card p-2.5 hover:bg-card/70"
                        >
                          <span
                            aria-hidden="true"
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-extrabold text-[var(--tile-ink)]"
                            style={{
                              background: `var(${TILES[pickByKey(item.id, TILES.length)]})`,
                            }}
                          >
                            {getInitials(item.user.name) || "M"}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-extrabold">
                              {item.user.name || "Mahasiswa"}
                            </span>
                            <span className="block truncate text-xs font-medium text-muted-foreground">
                              {item.assignment.title} ·{" "}
                              {item.hasDraft ? "draf AI siap" : "belum ada draf"}
                            </span>
                          </span>
                          <ArrowRight
                            size={16}
                            className="shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-2xl bg-card p-5">
                    <Check size={22} className="text-primary" aria-hidden="true" />
                    <h3 className="mt-2 font-bold">Belum ada jawaban yang perlu dikoreksi</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pengumpulan mahasiswa akan muncul di sini.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <aside aria-label="Aktivitas dan alat" className={styles.aside}>
        <h2 className="text-lg">Pengumpulan terbaru</h2>
        {recent.length > 0 ? (
          <ul className="space-y-2">
            {recent.map((item, index) => (
              <li key={item.id}>
                <Link
                  href={reviewPath(item)}
                  className={cn(
                    "block rounded-2xl p-3.5",
                    index % 2 === 0
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-card text-foreground",
                  )}
                >
                  <span className="block truncate text-sm font-extrabold">
                    {item.assignment.title}
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold break-words opacity-85">
                    {item.user.name} · {formatRelativeTime(item.createdAt).toLowerCase()}
                    {item.released ? " · nilai dirilis" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada pengumpulan.</p>
        )}
        <div className="mt-auto space-y-2 pt-2">
          <Link
            href="/rubrics"
            className="flex items-center gap-3 rounded-2xl bg-card p-3.5 text-sm font-bold"
          >
            <FileText size={18} className="shrink-0 text-primary" aria-hidden="true" />
            Acuan & rubrik
            <ArrowRight size={15} className="ml-auto shrink-0" aria-hidden="true" />
          </Link>
          <AIStatusNote />
        </div>
      </aside>

      <dialog ref={taskDialog} className={styles.taskDialog} aria-labelledby="task-dialog-title">
        <div className={styles.dialogHeading}>
          <div>
            <h2 id="task-dialog-title">Buat tugas untuk kelas mana?</h2>
            <p>Pilih kelas tujuan untuk melanjutkan.</p>
          </div>
          <button
            type="button"
            aria-label="Tutup pilihan kelas"
            onClick={() => taskDialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <ul>
          {classes.map((item) => (
            <li key={item.id}>
              <Link
                href={`/classes/${item.id}/assignments/new`}
                onClick={() => taskDialog.current?.close()}
              >
                <BookOpen size={19} aria-hidden="true" />
                <span>{item.name}</span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </dialog>
    </div>
  );
}
